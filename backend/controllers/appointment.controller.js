import Appointment, { ACTIVE_STATUS } from '../models/Appointment.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Organization from '../models/Organization.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { ChatRoom } from '../models/Chat.js';
import { asyncHandler, AppError, todayLagos, weekdayKey, naira } from '../utils/helpers.js';
import { nextQueueNumber, queueKeyFor, broadcastQueue, positionOf, queueMessage } from '../services/queue.service.js';
import { notify } from '../services/notify.service.js';
import { providerRecipients, canManage, confirmAppointment, refreshPaymentStatus, amountDueNow } from '../services/appointment.service.js';
import { initializePayment } from '../services/payment.service.js';
import { createPrescription } from './prescription.controller.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function loadManageable(req) {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) throw new AppError('Appointment not found', 404);
  if (!(await canManage(req.user, appt))) throw new AppError('Not allowed', 403);
  return appt;
}

/** POST /appointments  { doctorId | organizationId, department?, date, time?, reason } */
export const createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, organizationId, date, time, reason } = req.body;
  let { department } = req.body;
  if (!doctorId && !organizationId) throw new AppError('Select a doctor or a hospital');
  if (!DATE_RE.test(date || '')) throw new AppError('date must be YYYY-MM-DD');
  if (date < todayLagos()) throw new AppError('Date cannot be in the past');

  let settings, fee = 0, orgId = null;

  if (doctorId) {
    const profile = await DoctorProfile.findOne({ user: doctorId }).populate('user', 'role isActive isApproved');
    if (!profile || profile.user.role !== 'doctor' || !profile.user.isActive || !profile.user.isApproved)
      throw new AppError('Doctor not available', 404);
    if (profile.availability?.length && !profile.availability.some((s) => s.day === weekdayKey(date)))
      throw new AppError('Doctor does not work on that day');
    if (organizationId) {
      if (!profile.organizations.map(String).includes(String(organizationId))) throw new AppError('Doctor does not belong to that hospital');
      orgId = organizationId;
    }
    settings = profile.paymentSettings || {};
    fee = settings.appointmentFee ?? profile.consultationFee ?? 0;
    department = profile.specialization;
  } else {
    const org = await Organization.findOne({ _id: organizationId, type: { $in: ['hospital', 'clinic'] }, status: 'approved' });
    if (!org) throw new AppError('Hospital not found', 404);
    if (!department) throw new AppError('Choose a department');
    if (org.departments?.length && !org.departments.some((d) => d.toLowerCase() === department.toLowerCase()))
      throw new AppError('Department not offered by this hospital');
    orgId = org._id;
    settings = org.paymentSettings || {};
    fee = settings.appointmentFee ?? 0;
  }

  const mode = settings.mode || 'arrival';
  const deposit = mode === 'deposit' ? Math.min(settings.depositAmount || 0, fee) : 0;
  const queueKey = queueKeyFor({ doctor: doctorId, organization: orgId, date });

  const dup = await Appointment.exists({ patient: req.user._id, queueKey, status: { $in: ACTIVE_STATUS } });
  if (dup) throw new AppError('You already have an active appointment for this day', 409);

  const appt = await Appointment.create({
    patient: req.user._id, doctor: doctorId || undefined, organization: orgId || undefined,
    department, date, time, reason, queueKey, queueNumber: await nextQueueNumber(queueKey),
    payment: { mode, totalAmount: fee, depositAmount: deposit, status: fee > 0 ? 'unpaid' : 'free' },
  });

  const pos = await positionOf(appt);
  await notify(await providerRecipients(appt), {
    type: 'appointment:new', title: 'New appointment request',
    body: `${req.user.fullName} requested an appointment on ${date}${time ? ` at ${time}` : ''} (${department}).`,
    data: { appointmentId: appt._id },
  });
  await notify(req.user._id, {
    type: 'appointment:booked', title: 'Appointment request sent',
    body: `Your request for ${date} was sent. ${queueMessage(pos)}.`, data: { appointmentId: appt._id, position: pos },
  });
  await broadcastQueue(queueKey);

  res.status(201).json({ status: 'success', data: appt, meta: { position: pos, message: queueMessage(pos) } });
});

/** GET /appointments/mine?status= — patient view, active ones carry live queue position */
export const myAppointments = asyncHandler(async (req, res) => {
  const filter = { patient: req.user._id, ...(req.query.status && { status: req.query.status }) };
  const list = await Appointment.find(filter).sort('-createdAt').limit(100)
    .populate('doctor', 'fullName avatar').populate('organization', 'name').lean();
  for (const a of list) {
    if (ACTIVE_STATUS.includes(a.status)) {
      a.position = await positionOf(a);
      a.queueMessage = queueMessage(a.position);
    }
  }
  res.json({ status: 'success', data: list, meta: { total: list.length } });
});

export const getAppointment = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id)
    .populate('patient', 'fullName phone avatar gender dateOfBirth')
    .populate('doctor', 'fullName avatar').populate('organization', 'name').populate('prescriptions');
  if (!appt) throw new AppError('Appointment not found', 404);
  const isPatient = String(appt.patient._id) === String(req.user._id);
  if (!isPatient && !(await canManage(req.user, appt))) throw new AppError('Not allowed', 403);
  const position = await positionOf(appt);
  res.json({ status: 'success', data: appt, meta: { position, message: position ? queueMessage(position) : null } });
});

/** GET /appointments/provider?date=&status= — doctor / hospital inbox, ordered by queue */
export const providerAppointments = asyncHandler(async (req, res) => {
  const { date = todayLagos(), status } = req.query;
  let scope;
  if (req.user.role === 'doctor') {
    const orgs = await DoctorProfile.findOne({ user: req.user._id }).distinct('organizations');
    scope = { $or: [{ doctor: req.user._id }, { doctor: null, organization: { $in: orgs } }] };
  } else if (req.user.role === 'hospital_admin') {
    scope = { organization: req.user.organization };
  } else throw new AppError('Not allowed', 403);

  const list = await Appointment.find({ ...scope, ...(date !== 'all' && { date }), ...(status && { status }) })
    .sort('date queueNumber').populate('patient', 'fullName phone avatar gender dateOfBirth').lean();
  res.json({ status: 'success', data: list, meta: { total: list.length, date } });
});

/** POST /appointments/:id/accept */
export const acceptAppointment = asyncHandler(async (req, res) => {
  const appt = await loadManageable(req);
  const claim = { status: 'pending' };
  const set = { decidedBy: req.user._id, decidedAt: new Date() };
  if (!appt.doctor && req.user.role === 'doctor') set.doctor = req.user._id; // hospital doctor takes the case

  const needsPayNow = appt.payment.totalAmount > 0 && ['booking', 'deposit'].includes(appt.payment.mode);
  set.status = needsPayNow ? 'awaiting_payment' : 'confirmed';

  const updated = await Appointment.findOneAndUpdate({ _id: appt._id, ...claim }, { $set: set }, { new: true }); // atomic: first staff to act wins
  if (!updated) throw new AppError('Appointment already handled', 409);

  if (needsPayNow) {
    await notify(updated.patient, {
      type: 'appointment:accepted', title: 'Appointment accepted — payment required',
      body: `Your appointment on ${updated.date} was accepted. Pay ${naira(amountDueNow(updated))} to confirm your slot and unlock chat.`,
      data: { appointmentId: updated._id, amountDue: amountDueNow(updated) },
    });
    await broadcastQueue(updated.queueKey);
  } else {
    await confirmAppointment(updated);
  }
  res.json({ status: 'success', data: updated });
});

/** POST /appointments/:id/reject { reason } */
export const rejectAppointment = asyncHandler(async (req, res) => {
  const appt = await loadManageable(req);
  const updated = await Appointment.findOneAndUpdate(
    { _id: appt._id, status: { $in: ['pending', 'awaiting_payment'] } },
    { status: 'rejected', rejectionReason: req.body.reason, decidedBy: req.user._id, decidedAt: new Date() }, { new: true });
  if (!updated) throw new AppError('Only pending appointments can be rejected', 409);
  await notify(updated.patient, {
    type: 'appointment:rejected', title: 'Appointment declined',
    body: `Your appointment request for ${updated.date} was declined.${req.body.reason ? ` Reason: ${req.body.reason}` : ''}`,
    data: { appointmentId: updated._id },
  });
  await broadcastQueue(updated.queueKey);
  res.json({ status: 'success', data: updated });
});

/** POST /appointments/:id/skip — sends the patient to the back of the queue */
export const skipAppointment = asyncHandler(async (req, res) => {
  const appt = await loadManageable(req);
  if (!['pending', 'confirmed'].includes(appt.status)) throw new AppError('Only waiting appointments can be skipped', 409);
  appt.queueNumber = await nextQueueNumber(appt.queueKey);
  appt.skipCount += 1;
  await appt.save();
  const pos = await positionOf(appt);
  await notify(appt.patient, {
    type: 'appointment:skipped', title: 'You were moved down the queue',
    body: `The doctor attended to another patient first. ${queueMessage(pos)}.`, data: { appointmentId: appt._id, position: pos },
  });
  await broadcastQueue(appt.queueKey);
  res.json({ status: 'success', data: appt, meta: { position: pos } });
});

/** POST /appointments/:id/cancel (patient) */
export const cancelAppointment = asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
  if (!appt) throw new AppError('Appointment not found', 404);
  if (!['pending', 'awaiting_payment', 'confirmed'].includes(appt.status)) throw new AppError('Cannot cancel at this stage', 409);
  appt.status = 'cancelled';
  if (appt.payment.amountPaid > 0) appt.payment.refundRequired = true; // handled by admin / refund flow
  await appt.save();
  if (appt.chatRoom) await ChatRoom.findByIdAndUpdate(appt.chatRoom, { isClosed: true });
  await notify(await providerRecipients(appt), {
    type: 'appointment:cancelled', title: 'Appointment cancelled',
    body: `${req.user.fullName} cancelled the appointment on ${appt.date}.`, data: { appointmentId: appt._id },
  });
  await broadcastQueue(appt.queueKey);
  res.json({ status: 'success', data: appt });
});

const TRANSITIONS = {
  confirmed: ['in_progress', 'completed', 'no_show'],
  in_progress: ['completed'],
};

/** PATCH /appointments/:id/status { status, condition, diagnosis, notes, followUpDate, prescription:{ items:[], purpose } } */
export const updateStatus = asyncHandler(async (req, res) => {
  const appt = await loadManageable(req);
  const { status, condition, diagnosis, notes, followUpDate, prescription } = req.body;
  if (!TRANSITIONS[appt.status]?.includes(status)) throw new AppError(`Cannot move from ${appt.status} to ${status}`, 409);

  if (status === 'in_progress' && !appt.doctor && req.user.role === 'doctor') appt.doctor = req.user._id;
  appt.status = status;

  if (status === 'completed') {
    appt.outcome = { condition, diagnosis, notes, followUpDate, completedAt: new Date() };
    if (prescription?.items?.length) {
      if (req.user.role !== 'doctor') throw new AppError('Only a doctor can prescribe', 403);
      const rx = await createPrescription({ appt, doctorId: req.user._id, items: prescription.items, purpose: prescription.purpose || diagnosis });
      appt.prescriptions.push(rx._id);
    }
  }
  await appt.save();

  const label = { in_progress: 'is in progress', completed: 'is complete', no_show: 'was marked as missed' }[status];
  await notify(appt.patient, {
    type: `appointment:${status}`, title: `Appointment ${status.replace('_', ' ')}`,
    body: `Your appointment ${label}.` +
      (condition ? ` Status: ${condition}.` : '') + (appt.prescriptions.length ? ' A prescription has been issued — see Prescriptions.' : ''),
    data: { appointmentId: appt._id },
  });
  await broadcastQueue(appt.queueKey);
  res.json({ status: 'success', data: appt });
});

/** POST /appointments/:id/collect-payment { amount } — provider records cash/POS (pay-on-arrival or deposit balance) */
export const collectPayment = asyncHandler(async (req, res) => {
  const appt = await loadManageable(req);
  const balance = appt.payment.totalAmount - appt.payment.amountPaid;
  const amount = Math.min(+req.body.amount || balance, balance);
  if (!(amount > 0)) throw new AppError('Nothing to collect', 409);
  appt.payment.amountPaid += amount;
  appt.payment.paidAt = new Date();
  refreshPaymentStatus(appt);
  await appt.save();
  await notify(appt.patient, { type: 'payment:received', title: 'Payment recorded', body: `${naira(amount)} recorded for your appointment on ${appt.date}.`, data: { appointmentId: appt._id } });
  res.json({ status: 'success', data: appt });
});

/** POST /appointments/:id/pay (patient) -> { authorization_url } */
export const payForAppointment = asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
  if (!appt) throw new AppError('Appointment not found', 404);
  if (appt.status !== 'awaiting_payment') throw new AppError('Payment is not required right now', 409);
  const amount = amountDueNow(appt);
  if (!(amount > 0)) throw new AppError('Nothing to pay', 409);

  const reference = `APT-${appt._id}-${Date.now()}`;
  await PaymentTransaction.create({ reference, user: req.user._id, purpose: 'appointment', appointment: appt._id, amount });
  const data = await initializePayment({
    email: req.user.email, amount, reference, metadata: { purpose: 'appointment', appointmentId: String(appt._id) },
    callbackUrl: `${process.env.CLIENT_URL}/appointments/${appt._id}?ref=${reference}`,
  });
  res.json({ status: 'success', data: { ...data, amount, reference } });
});
