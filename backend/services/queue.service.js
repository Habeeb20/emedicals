import Appointment, { ACTIVE_STATUS } from '../models/Appointment.js';
import Counter from '../models/Counter.js';
import { emitToUser } from '../socket/io.js';
import { ordinal } from '../utils/helpers.js';

export const queueKeyFor = ({ doctor, organization, date }) =>
  `${doctor ? `d:${doctor}` : `o:${organization}`}:${date}`;

export async function nextQueueNumber(queueKey) {
  const c = await Counter.findOneAndUpdate({ _id: queueKey }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return c.seq;
}

export async function positionOf(appt) {
  if (!ACTIVE_STATUS.includes(appt.status)) return null;
  const ahead = await Appointment.countDocuments({
    queueKey: appt.queueKey, status: { $in: ACTIVE_STATUS }, queueNumber: { $lt: appt.queueNumber },
  });
  return ahead + 1;
}

export const queueMessage = (pos) => (pos === 1 ? "You're 1st in line — you're next" : `You're ${ordinal(pos)} in line`);

/** Recompute positions for everyone still waiting in this queue and push them live. */
export async function broadcastQueue(queueKey) {
  const list = await Appointment.find({ queueKey, status: { $in: ACTIVE_STATUS } })
    .sort('queueNumber').select('patient queueNumber').lean();
  list.forEach((a, i) =>
    emitToUser(a.patient, 'queue:update', {
      appointmentId: a._id, position: i + 1, total: list.length, message: queueMessage(i + 1),
    })
  );
  return list.length;
}
