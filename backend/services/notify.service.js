import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { emitToUser } from '../socket/io.js';
import { sendEmail, emailTemplate } from '../utils/email.js';

/**
 * Persist + push (socket) + email.
 * userIds: id | id[]   opts: { type, title, body, data, email = true }
 */
export async function notify(userIds, { type, title, body, data = {}, email = true }) {
  const ids = [...new Set([].concat(userIds).filter(Boolean).map(String))];
  if (!ids.length) return;

  const docs = await Notification.insertMany(ids.map((user) => ({ user, type, title, body, data })));
  docs.forEach((d) => emitToUser(d.user, 'notification:new', d));

  if (email) {
    const users = await User.find({ _id: { $in: ids } }).select('email fullName').lean();
    // fire-and-forget; swap for a job queue (BullMQ) when fan-out gets large
    users.forEach((u) =>
      sendEmail({ to: u.email, subject: title, html: emailTemplate(u.fullName, title, body) })
        .catch((e) => console.error('[email]', u.email, e.message))
    );
  }
}
