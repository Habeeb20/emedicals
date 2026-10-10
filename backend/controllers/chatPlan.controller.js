import crypto from 'crypto';
import { ChatWallet, ChatPurchase, CHAT_PLANS, SESSION_HOURS } from '../models/ChatPlan.js';
import { HttpError, handle } from '../utils/engagement.js';
import { withTx } from '../utils/pharmacy.js';
import { initializeTransaction, verifyTransaction, validWebhookSignature } from '../services/paystack.service.js';

/**
 * Credits the passes for a paid purchase exactly once.
 * The pending -> paid flip and the wallet credit happen in one transaction, so a
 * verify call and a webhook arriving together can never double-credit.
 */
async function settlePurchase(reference, paidKobo) {
  return withTx(async (session) => {
    const existing = await ChatPurchase.findOne({ reference }).session(session);
    if (!existing) return { status: 'unknown' };
    if (existing.status === 'paid') return { status: 'already_paid', purchase: existing };
    if (paidKobo !== existing.amount * 100) {
      await ChatPurchase.updateOne({ _id: existing._id }, { $set: { status: 'failed' } }, { session });
      return { status: 'amount_mismatch' };
    }
    const purchase = await ChatPurchase.findOneAndUpdate(
      { _id: existing._id, status: 'pending' },
      { $set: { status: 'paid', paidAt: new Date() } },
      { new: true, session }
    );
    if (!purchase) return { status: 'already_paid', purchase: existing };
    await ChatWallet.updateOne(
      { user: purchase.user },
      { $inc: { passes: purchase.passes, totalPurchased: purchase.passes } },
      { upsert: true, session }
    );
    return { status: 'credited', purchase };
  });
}

/** GET /chat-plans   (public) */
export const getPlans = handle(async (_req, res) => {
  res.json({ success: true, data: CHAT_PLANS, meta: { sessionHours: SESSION_HOURS } });
});

/** GET /chat-plans/me   (auth) */
export const getMyWallet = handle(async (req, res) => {
  const w = await ChatWallet.findOne({ user: req.user._id }).lean();
  res.json({ success: true, data: { passes: w?.passes || 0, totalPurchased: w?.totalPurchased || 0, totalUsed: w?.totalUsed || 0 } });
});

/** POST /chat-plans/checkout   (auth) body: { planId } -> { authorizationUrl, reference } */
export const checkout = handle(async (req, res) => {
  if (req.user.role === 'pharmacist') throw new HttpError(403, 'Pharmacy accounts do not need a chat plan');
  const plan = CHAT_PLANS.find((p) => p.id === req.body?.planId);
  if (!plan) throw new HttpError(400, 'Choose a valid plan');

  const reference = `CHAT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  await ChatPurchase.create({ user: req.user._id, planId: plan.id, passes: plan.passes, amount: plan.price, reference });

  const client = (process.env.CLIENT_URL || '').split(',')[0];
  const data = await initializeTransaction({
    email: req.user.email,
    amountNaira: plan.price,
    reference,
    callbackUrl: `${client}/chat/pharmacy`,
    metadata: { userId: String(req.user._id), planId: plan.id },
  });
  res.json({ success: true, data: { authorizationUrl: data.authorization_url, reference } });
});

/** GET /chat-plans/verify/:reference   (auth) — called when the user returns from the payment page */
export const verifyPayment = handle(async (req, res) => {
  const purchase = await ChatPurchase.findOne({ reference: req.params.reference, user: req.user._id }).lean();
  if (!purchase) throw new HttpError(404, 'Payment not found');
  if (purchase.status === 'paid') {
    return res.json({ success: true, data: { message: `Your ${purchase.passes} chat passes are ready.` } });
  }

  const tx = await verifyTransaction(purchase.reference);
  if (tx.status !== 'success') {
    throw new HttpError(402, tx.status === 'abandoned' ? 'Payment was not completed.' : 'Payment was not successful.');
  }
  const out = await settlePurchase(purchase.reference, tx.amount);
  if (out.status === 'amount_mismatch') throw new HttpError(400, 'The amount paid does not match the plan. Contact support.');
  res.json({ success: true, data: { message: `Payment received. ${purchase.passes} chat passes added.` } });
});

/**
 * POST /chat-plans/webhook   (Paystack calls this)
 * Mount with express.raw() BEFORE express.json(), see README.
 */
export const chatPlanpaystackWebhook = async (req, res) => {
  try {
    if (!validWebhookSignature(req.body, req.get('x-paystack-signature'))) return res.sendStatus(401);
    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'charge.success') await settlePurchase(event.data.reference, event.data.amount);
    return res.sendStatus(200);
  } catch {
    return res.sendStatus(500); // Paystack retries on non-200
  }
};