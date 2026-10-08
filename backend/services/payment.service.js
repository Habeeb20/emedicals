import crypto from 'crypto';
import PaymentTransaction from '../models/PaymentTransaction.js';
import Appointment from '../models/Appointment.js';
import { QuickChatWallet } from '../models/QuickChat.js';
import { confirmAppointment, refreshPaymentStatus } from './appointment.service.js';
import { notify } from './notify.service.js';
import { naira } from '../utils/helpers.js';

// Paystack. Swap this file if you use Flutterwave/Paylony — only initialize/verify/signature change.
const PS = 'https://api.paystack.co';
const headers = () => ({ Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' });

export async function initializePayment({ email, amount, reference, metadata, callbackUrl }) {
  const res = await fetch(`${PS}/transaction/initialize`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ email, amount: Math.round(amount * 100), reference, metadata, callback_url: callbackUrl }),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || 'Could not start payment');
  return json.data; // { authorization_url, access_code, reference }
}

async function verifyPayment(reference) {
  const res = await fetch(`${PS}/transaction/verify/${encodeURIComponent(reference)}`, { headers: headers() });
  const json = await res.json();
  return json.data || {};
}

export const validWebhookSignature = (rawBody, signature) =>
  signature && crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex') === signature;

/** Idempotent: safe to call from both the webhook and the client's /verify call */
export async function settleTransaction(reference) {
  const tx = await PaymentTransaction.findOne({ reference });
  if (!tx || tx.status === 'success') return tx;

  const v = await verifyPayment(reference); // never trust the webhook body alone
  if (v.status !== 'success' || v.amount !== Math.round(tx.amount * 100)) {
    if (['failed', 'abandoned', 'reversed'].includes(v.status)) { tx.status = 'failed'; await tx.save(); }
    return tx;
  }

  const claimed = await PaymentTransaction.findOneAndUpdate(
    { reference, status: 'pending' }, { status: 'success', paidAt: new Date() }, { new: true }
  );
  if (!claimed) return tx; // another request already settled it

  if (claimed.purpose === 'appointment') {
    const appt = await Appointment.findById(claimed.appointment);
    appt.payment.amountPaid += claimed.amount;
    appt.payment.lastReference = reference;
    appt.payment.paidAt = new Date();
    refreshPaymentStatus(appt);
    if (appt.status === 'awaiting_payment') {
      await confirmAppointment(appt);
    } else {
      await appt.save();
      await notify(appt.patient, { type: 'payment:received', title: 'Payment received', body: `We received ${naira(claimed.amount)}.`, data: { appointmentId: appt._id } });
    }
    if (appt.decidedBy || appt.doctor) {
      await notify(appt.doctor || appt.decidedBy, {
        type: 'payment:received', title: 'Patient payment received',
        body: `${naira(claimed.amount)} received for the appointment on ${appt.date}.`, data: { appointmentId: appt._id },
      });
    }
  } else if (claimed.purpose === 'quickchat') {
    const wallet = await QuickChatWallet.findOneAndUpdate(
      { user: claimed.user }, { $inc: { credits: claimed.credits } }, { upsert: true, new: true }
    );
    await notify(claimed.user, {
      type: 'quickchat:credited', title: 'Quick chat credits added',
      body: `${claimed.credits} quick chats added. Balance: ${wallet.credits}.`, data: { credits: wallet.credits },
    });
  }
  return claimed;
}
