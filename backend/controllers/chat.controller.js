import { ChatRoom, Message } from '../models/Chat.js';
import { asyncHandler, AppError } from '../utils/helpers.js';

/** GET /chat/rooms */
export const myRooms = asyncHandler(async (req, res) => {
  const rooms = await ChatRoom.find({ participants: req.user._id }).sort('-lastMessageAt -createdAt')
    .populate('participants', 'fullName avatar role').lean();
  res.json({ status: 'success', data: rooms });
});

/** GET /chat/rooms/:id/messages?before=<ISO>&limit=30 */
export const roomMessages = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findOne({ _id: req.params.id, participants: req.user._id });
  if (!room) throw new AppError('Chat not found', 404);
  const limit = Math.min(100, +req.query.limit || 30);
  const msgs = await Message.find({ room: room._id, ...(req.query.before && { createdAt: { $lt: new Date(req.query.before) } }) })
    .sort('-createdAt').limit(limit).populate('sender', 'fullName avatar role').lean();
  res.json({ status: 'success', data: msgs.reverse(), meta: { isClosed: room.isClosed } });
});
