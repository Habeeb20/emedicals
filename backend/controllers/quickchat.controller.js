import { QuickChatWallet, QuickChatRequest } from '../models/QuickChat.js';
import { ChatRoom } from '../models/Chat.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { QUICK_CHAT_PLANS, QUICK_CHAT_REQUEST_TTL_MIN } from '../utils/plans.js';
import { asyncHandler, AppError, rx, naira } from '../utils/helpers.js';
import { notify } from '../services/notify.service.js';
import { initializePayment } from '../services/payment.service.js';
import { getIO } from '../socket/io.js';

export const listPlans = asyncHandler(async (req, res) => {
  const wallet = await QuickChatWallet.findOne({ user: req.user._id }).lean();
  res.json({ status: 'success', data: QUICK_CHAT_PLANS, meta: { credits: wallet?.credits || 0 } });
});

/** POST /quickchat/subscribe { planId } -> Paystack checkout */
export const subscribe = asyncHandler(async (req, res) => {
  const plan = QUICK_CHAT_PLANS.find((p) => p.id === req.body.planId);
  if (!plan) throw new AppError('Unknown plan', 404);
  const reference = `QC-${req.user._id}-${Date.now()}`;
  await PaymentTransaction.create({ reference, user: req.user._id, purpose: 'quickchat', planId: plan.id, credits: plan.credits, amount: plan.price });
  const data = await initializePayment({
    email: req.user.email, amount: plan.price, reference, metadata: { purpose: 'quickchat', planId: plan.id },
    callbackUrl: `${process.env.CLIENT_URL}/quick-chat?ref=${reference}`,
  });
  res.json({ status: 'success', data: { ...data, amount: plan.price, reference } });
});

/** Departments a provider user answers for */
async function departmentsFor(user) {
  if (user.role === 'doctor') {
    const p = await DoctorProfile.findOne({ user: user._id }).select('specialization').lean();
    return p ? [p.specialization] : [];
  }
  if (user.role === 'hospital_admin') {
    const org = await Organization.findById(user.organization).select('departments').lean();
    return org?.departments || [];
  }
  return [];
}

/** POST /quickchat/requests { department, message } — costs 1 credit */
export const createRequest = asyncHandler(async (req, res) => {
  const { department, message } = req.body;
  if (!department) throw new AppError('Choose a department');

  // atomic debit: fails cleanly when balance is 0
  const wallet = await QuickChatWallet.findOneAndUpdate({ user: req.user._id, credits: { $gte: 1 } }, { $inc: { credits: -1 } }, { new: true });
  if (!wallet) throw new AppError('No quick chat credits left. Subscribe to continue.', 402);

  let request;
  try {
    request = await QuickChatRequest.create({
      patient: req.user._id, department, message, expiresAt: new Date(Date.now() + QUICK_CHAT_REQUEST_TTL_MIN * 60000),
    });
  } catch (e) {
    await QuickChatWallet.updateOne({ user: req.user._id }, { $inc: { credits: 1 } });
    throw e;
  }

  // everyone in that department: doctors of the specialty + hospital admins whose hospital lists it
  const [docIds, orgIds] = await Promise.all([
    DoctorProfile.find({ specialization: rx(department) }).distinct('user'),
    Organization.find({ departments: rx(department), status: 'approved' }).distinct('_id'),
  ]);
  const adminIds = await User.find({ organization: { $in: orgIds }, role: 'hospital_admin', isActive: true }).distinct('_id');
  const recipients = await User.find({ _id: { $in: [...docIds, ...adminIds] }, isActive: true, isApproved: true }).distinct('_id');

  await notify(recipients, {
    type: 'quickchat:new', title: `Quick chat request — ${department}`,
    body: `A patient needs help in ${department}: "${(message || '').slice(0, 120)}". First to accept starts the chat.`,
    data: { requestId: request._id, department },
  });
  res.status(201).json({ status: 'success', data: request, meta: { credits: wallet.credits, notified: recipients.length } });
});

/** GET /quickchat/requests/open (doctor / hospital_admin) */
export const openRequests = asyncHandler(async (req, res) => {
  const depts = await departmentsFor(req.user);
  if (!depts.length) return res.json({ status: 'success', data: [], meta: { total: 0 } });
  const list = await QuickChatRequest.find({
    status: 'open', expiresAt: { $gt: new Date() }, department: { $in: depts.map((d) => rx(d)) },
  }).sort('createdAt').populate('patient', 'fullName avatar gender').lean();
  res.json({ status: 'success', data: list, meta: { total: list.length } });
});

/** POST /quickchat/requests/:id/accept — first provider wins */
export const acceptRequest = asyncHandler(async (req, res) => {
  const depts = await departmentsFor(req.user);
  const r0 = await QuickChatRequest.findById(req.params.id);
  if (!r0) throw new AppError('Request not found', 404);
  if (!depts.some((d) => d.toLowerCase() === r0.department.toLowerCase())) throw new AppError('Not your department', 403);

  const request = await QuickChatRequest.findOneAndUpdate(
    { _id: r0._id, status: 'open', expiresAt: { $gt: new Date() } },
    { status: 'accepted', acceptedBy: req.user._id, organization: req.user.organization }, { new: true });
  if (!request) throw new AppError('Already taken or expired', 409);

  const room = await ChatRoom.create({ type: 'quick', quickChat: request._id, participants: [request.patient, req.user._id] });
  request.chatRoom = room._id;
  await request.save();

  await notify(request.patient, {
    type: 'quickchat:accepted', title: 'A provider joined your quick chat',
    body: `${req.user.fullName} is ready to chat about ${request.department}.`, data: { requestId: request._id, chatRoomId: room._id },
  });
  getIO()?.emit('quickchat:taken', { requestId: request._id }); // lets other providers' lists drop it live
  res.json({ status: 'success', data: request, meta: { chatRoomId: room._id } });
});

/** POST /quickchat/requests/:id/close (patient or the provider who accepted) */
export const closeRequest = asyncHandler(async (req, res) => {
  const r = await QuickChatRequest.findById(req.params.id);
  if (!r) throw new AppError('Request not found', 404);
  const allowed = [r.patient, r.acceptedBy].filter(Boolean).map(String).includes(String(req.user._id));
  if (!allowed) throw new AppError('Not allowed', 403);
  if (r.status !== 'accepted') throw new AppError('Chat is not active', 409);
  r.status = 'closed';
  await r.save();
  await ChatRoom.findByIdAndUpdate(r.chatRoom, { isClosed: true });
  res.json({ status: 'success', data: r });
});

/** GET /quickchat/requests/mine (patient) */
export const myRequests = asyncHandler(async (req, res) => {
  const list = await QuickChatRequest.find({ patient: req.user._id }).sort('-createdAt').limit(50).populate('acceptedBy', 'fullName avatar').lean();
  res.json({ status: 'success', data: list });
});

/** Run every minute: expire unanswered requests and refund the credit. */
export async function sweepExpiredRequests() {
  const expired = await QuickChatRequest.find({ status: 'open', expiresAt: { $lte: new Date() } }).limit(100);
  for (const r of expired) {
    const done = await QuickChatRequest.findOneAndUpdate({ _id: r._id, status: 'open' }, { status: 'expired', creditRefunded: true });
    if (!done) continue;
    await QuickChatWallet.updateOne({ user: r.patient }, { $inc: { credits: 1 } });
    await notify(r.patient, {
      type: 'quickchat:expired', title: 'No provider available yet',
      body: `Nobody in ${r.department} accepted in time. Your credit was refunded — try again shortly.`, data: { requestId: r._id },
    });
  }
}
