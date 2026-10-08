import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ChatRoom, Message } from '../models/Chat.js';
import { setIO, emitToUser } from './io.js';
import { notify } from '../services/notify.service.js';

const EMAIL_AFTER_IDLE_MS = 10 * 60 * 1000; // email only if the room was quiet for 10 min (avoid email per message)

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL?.split(',') || '*', credentials: true },
  });
  setIO(io);

  // Client: io(API_URL, { auth: { token } })
  io.use(async (socket, next) => {
    try {
      const { id } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET); // adjust claim name if yours isn't "id"
      const user = await User.findById(id).select('fullName role organization isActive');
      if (!user?.isActive) throw new Error('inactive');
      socket.user = user;
      next();
    } catch { next(new Error('Unauthorized')); }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    socket.join(`user:${user._id}`);                       // personal channel: notifications, queue updates
    if (user.organization) socket.join(`org:${user.organization}`);

    socket.on('chat:join', async ({ roomId } = {}, ack) => {
      const room = await ChatRoom.findOne({ _id: roomId, participants: user._id }).lean();
      if (!room) return ack?.({ ok: false, error: 'Not allowed' });
      socket.join(`chat:${roomId}`);
      ack?.({ ok: true, isClosed: room.isClosed });
    });

    socket.on('chat:send', async ({ roomId, text, attachment } = {}, ack) => {
      try {
        const body = String(text || '').trim();
        if (!body && !attachment?.url) return ack?.({ ok: false, error: 'Empty message' });
        const room = await ChatRoom.findOne({ _id: roomId, participants: user._id });
        if (!room) return ack?.({ ok: false, error: 'Not allowed' });
        if (room.isClosed) return ack?.({ ok: false, error: 'This chat is closed' });

        const idle = !room.lastMessageAt || Date.now() - room.lastMessageAt.getTime() > EMAIL_AFTER_IDLE_MS;
        const msg = await Message.create({ room: room._id, sender: user._id, text: body.slice(0, 4000), attachment, readBy: [user._id] });
        room.lastMessageAt = new Date();
        await room.save();

        const payload = { ...msg.toObject(), sender: { _id: user._id, fullName: user.fullName, role: user.role } };
        io.to(`chat:${roomId}`).emit('chat:message', payload);

        const others = room.participants.filter((p) => String(p) !== String(user._id));
        others.forEach((p) => emitToUser(p, 'chat:unread', { roomId, preview: body.slice(0, 80), from: user.fullName }));
        if (idle) {
          await notify(others, {
            type: 'chat:message', title: `New message from ${user.fullName}`,
            body: body ? `"${body.slice(0, 120)}"` : 'Sent an attachment.', data: { roomId }, email: true,
          });
        }
        ack?.({ ok: true, message: payload });
      } catch (e) { ack?.({ ok: false, error: 'Could not send' }); }
    });

    socket.on('chat:typing', ({ roomId, isTyping } = {}) =>
      socket.to(`chat:${roomId}`).emit('chat:typing', { roomId, userId: user._id, isTyping: !!isTyping }));

    socket.on('chat:read', async ({ roomId } = {}) => {
      await Message.updateMany({ room: roomId, readBy: { $ne: user._id } }, { $addToSet: { readBy: user._id } });
      socket.to(`chat:${roomId}`).emit('chat:read', { roomId, userId: user._id });
    });
  });

  return io;
}
