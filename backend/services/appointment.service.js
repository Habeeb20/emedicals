import Appointment from '../models/Appointment.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { ChatRoom } from '../models/Chat.js';
import { notify } from './notify.service.js';
import { broadcastQueue, positionOf, queueMessage } from './queue.service.js';
import { naira } from '../utils/helpers.js';

/** Who should be told about / can act on an appointment on the provider side */
export async function providerRecipients(appt) {
  if (appt.doctor) return [appt.doctor];
  const [admins, profiles, org] = await Promise.all([
    User.find({ organization: appt.organization, role: 'hospital_admin', isActive: true }).distinct('_id'),
    DoctorProfile.find({ organizations: appt.organization }).distinct('user'),
    Organization.findById(appt.organization).select('owner').lean(),
  ]);
  return [...admins, ...profiles, org?.owner].filter(Boolean);
}

export async function canManage(user, appt) {
  if (user.role === 'super_admin') return true;
  if (appt.doctor && String(appt.doctor) === String(user._id)) return true;
  if (!appt.organization) return false;
  if (user.role === 'hospital_admin') return String(user.organization) === String(appt.organization);
  if (user.role === 'doctor' && !appt.doctor) {
    return !!(await DoctorProfile.exists({ user: user._id, organizations: appt.organization }));
  }
  return false;
}

/** Appointment is accepted (and paid if required): open the chat, notify both sides, refresh the queue */
export async function confirmAppointment(appt) {
  appt.status = 'confirmed';
  if (!appt.chatRoom) {
    const provider = appt.doctor || appt.decidedBy;
    const room = await ChatRoom.create({
      type: 'appointment', appointment: appt._id, participants: [appt.patient, provider].filter(Boolean),
    });
    appt.chatRoom = room._id;
  }
  await appt.save();

  const pos = await positionOf(appt);
  const balance = Math.max(0, appt.payment.totalAmount - appt.payment.amountPaid);
  await notify(appt.patient, {
    type: 'appointment:confirmed',
    title: 'Appointment confirmed',
    body: `Your appointment on ${appt.date} is confirmed. ${queueMessage(pos)}.` +
      (balance > 0 ? ` Balance of ${naira(balance)} is payable on arrival.` : '') +
      ' You can now chat with your doctor in the app.',
    data: { appointmentId: appt._id, chatRoomId: appt.chatRoom, position: pos },
  });
  if (appt.decidedBy) {
    await notify(appt.decidedBy, {
      type: 'appointment:confirmed', title: 'Appointment confirmed',
      body: `A patient's appointment for ${appt.date} is confirmed. Chat is now open.`,
      data: { appointmentId: appt._id, chatRoomId: appt.chatRoom },
    });
  }
  await broadcastQueue(appt.queueKey);
  return appt;
}

export function refreshPaymentStatus(appt) {
  const { totalAmount, amountPaid } = appt.payment;
  appt.payment.status = totalAmount <= 0 ? 'free' : amountPaid >= totalAmount ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';
}

/** How much the patient must pay online right now */
export function amountDueNow(appt) {
  const { mode, totalAmount, depositAmount, amountPaid } = appt.payment;
  if (mode === 'booking') return Math.max(0, totalAmount - amountPaid);
  if (mode === 'deposit') return Math.max(0, depositAmount - amountPaid);
  return 0;
}
