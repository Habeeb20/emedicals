import User from '../models/User.js';
import Organization from '../models/Organization.js';
import { ChatRoom, Message } from '../models/Chat.js';
import { ChatWallet, SESSION_HOURS } from '../models/ChatPlan.js';
import { HttpError, handle, sameId } from '../utils/engagement.js';
import { objectId } from '../utils/pharmacy.js';
import { notify } from '../services/notify.service.js';

const isStaffOf = (user, room) =>
  user.role === 'pharmacist' && user.organization && sameId(user.organization, room.pharmacy);

const canAccess = (user, room) => sameId(room.patient, user._id) || isStaffOf(user, room);

const roomDTO = (r) => ({
  _id: r._id,
  pharmacy: r.pharmacy,
  patient: r.patient,
  sessionExpiresAt: r.sessionExpiresAt,
  sessionActive: !!r.sessionExpiresAt && new Date(r.sessionExpiresAt) > new Date(),
  lastMessageAt: r.lastMessageAt,
  lastMessage: r.lastMessage,
});

/**
 * POST /pharmacy-chat/rooms   (auth, patients)   body: { pharmacyId }
 * Opens (or continues) a chat with a pharmacy. If a 24h session is already open it is free;
 * otherwise one chat pass is used to open a new session.
 */
export const startRoom = handle(async (req, res) => {
  if (req.user.role === 'pharmacist') throw new HttpError(403, 'Pharmacy accounts reply from the pharmacy inbox');
  objectId(req.body?.pharmacyId, 'pharmacy id');

  const pharmacy = await Organization.findOne({ _id: req.body.pharmacyId, type: 'pharmacy', status: 'approved' }).select('name');
  if (!pharmacy) throw new HttpError(404, 'Pharmacy not found');

  const key = { type: 'pharmacy', pharmacy: pharmacy._id, patient: req.user._id };
  const existing = await ChatRoom.findOne(key);
  if (existing?.sessionExpiresAt && existing.sessionExpiresAt > new Date()) {
    return res.json({ success: true, data: { ...roomDTO(existing.toObject()), charged: false } });
  }

  // Use one pass. The conditional update is atomic, so two taps can't spend the same pass.
  const wallet = await ChatWallet.findOneAndUpdate(
    { user: req.user._id, passes: { $gte: 1 } },
    { $inc: { passes: -1, totalUsed: 1 } },
    { new: true }
  );
  if (!wallet) throw new HttpError(402, 'You need a chat pass to chat with a pharmacy. Buy a plan to continue.');

  let room;
  try {
    room = await ChatRoom.findOneAndUpdate(
      key,
      {
        $set: { sessionExpiresAt: new Date(Date.now() + SESSION_HOURS * 3600 * 1000), isClosed: false },
        $setOnInsert: { participants: [req.user._id] },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    await ChatWallet.updateOne({ user: req.user._id }, { $inc: { passes: 1, totalUsed: -1 } }); // give the pass back
    throw err;
  }

  const staff = await User.find({ organization: pharmacy._id, role: 'pharmacist', isActive: true }).select('_id').lean();
  notify(staff.map((s) => s._id), {
    type: 'pharmacy:chat_started',
    title: 'New patient chat',
    body: `${req.user.fullName} started a chat with ${pharmacy.name}.`,
    data: { roomId: String(room._id) },
  }).catch(() => {});

  res.status(201).json({ success: true, data: { ...roomDTO(room.toObject()), charged: true, passesLeft: wallet.passes } });
});

/** GET /pharmacy-chat/rooms   (auth) — patient: own chats. Pharmacist: their pharmacy's chats. */
export const listRooms = handle(async (req, res) => {
  const filter = { type: 'pharmacy' };
  if (req.user.role === 'pharmacist') {
    if (!req.user.organization) throw new HttpError(403, 'Your account is not linked to a pharmacy');
    filter.pharmacy = req.user.organization;
  } else {
    filter.patient = req.user._id;
  }

  const rooms = await ChatRoom.find(filter).sort('-lastMessageAt -updatedAt').limit(50)
    .populate('pharmacy', 'name logo').populate('patient', 'fullName avatar profilePicture').lean();

  const last = await Promise.all(rooms.map((r) => Message.findOne({ room: r._id }).sort('-createdAt').select('text sender createdAt').lean()));
  res.json({ success: true, data: rooms.map((r, i) => roomDTO({ ...r, lastMessage: last[i] })) });
});

/** GET /pharmacy-chat/rooms/:id/messages?before=ISODate&limit=30   (participants + that pharmacy's staff) */
export const getMessages = handle(async (req, res) => {
  objectId(req.params.id, 'room id');
  const room = await ChatRoom.findOne({ _id: req.params.id, type: 'pharmacy' })
    .populate('pharmacy', 'name logo').populate('patient', 'fullName avatar profilePicture').lean();
  if (!room || !canAccess(req.user, { ...room, pharmacy: room.pharmacy._id, patient: room.patient._id })) {
    throw new HttpError(404, 'Chat not found');
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
  const filter = { room: room._id };
  if (req.query.before) {
    const d = new Date(req.query.before);
    if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d };
  }
  const msgs = await Message.find(filter).sort('-createdAt').limit(limit).populate('sender', 'fullName role').lean();

  res.json({
    success: true,
    data: { room: roomDTO(room), me: req.user._id, messages: msgs.reverse(), hasMore: msgs.length === limit },
  });
});