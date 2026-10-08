import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/helpers.js';

export const myNotifications = asyncHandler(async (req, res) => {
  const [data, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort('-createdAt').limit(+req.query.limit || 30).lean(),
    Notification.countDocuments({ user: req.user._id, readAt: null }),
  ]);
  res.json({ status: 'success', data, meta: { unread } });
});

export const markRead = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id, readAt: null, ...(req.params.id && { _id: req.params.id }) };
  await Notification.updateMany(filter, { readAt: new Date() });
  res.json({ status: 'success' });
});
