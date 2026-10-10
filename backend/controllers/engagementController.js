import crypto from 'crypto';
import mongoose from 'mongoose';

import User, {
  Interaction, Review, LoyaltyTransaction, LOYALTY_RULES, TIERS,
} from '../models/User.js';
import Organization from '../models/Organization.js';
import Appointment from '../models/Appointment.js';

import { HttpError, handle, resolveTarget, isOwnTarget, sameId,
  safeAward, parsePagination, modelNameFor,} from '../utils/engagement.js';
import { hasBeenAttendedByPharmacy } from '../services/Pharmacyattendance.service.js';


const SHARE_CHANNELS = ['whatsapp', 'facebook', 'x', 'email', 'copy_link', 'other'];
const COUNT_FIELDS = 'likesCount sharesCount viewsCount';
const MODERATOR_ROLES = ['super_admin'];
const REVIEWER_FIELDS = 'fullName profilePicture avatar';

const getCounts = (targetType, targetId) =>
  mongoose.model(targetType).findById(targetId).select(COUNT_FIELDS).lean();

/* ================================================================== */
/* INTERACTIONS                                                        */
/* ================================================================== */

/**
 * POST /interactions/:targetType/:targetId/like   (auth)
 * Toggles like. Earns LIKE points the first time a given target is liked.
 */
export const toggleLike = handle(async (req, res) => {
  const { targetType, target } = await resolveTarget(req.params.targetType, req.params.targetId);

  if (isOwnTarget(targetType, target, req.user._id)) {
    throw new HttpError(400, "You can't like your own profile or organization");
  }

  const { liked } = await Interaction.toggleLike(req.user._id, targetType, target._id);
  const loyalty = liked ? await safeAward(req.user._id, 'LIKE', target._id) : undefined;
  const counts = await getCounts(targetType, target._id);

  res.json({ success: true, liked, likesCount: counts?.likesCount ?? 0, loyalty });
});

/**
 * POST /interactions/:targetType/:targetId/share   (auth)
 * body: { channel }
 */
export const recordShare = handle(async (req, res) => {
  const { targetType, target } = await resolveTarget(req.params.targetType, req.params.targetId);
  const channel = SHARE_CHANNELS.includes(req.body?.channel) ? req.body.channel : 'other';

  await Interaction.recordShare(req.user._id, targetType, target._id, channel);

  // No points for sharing your own profile
  const loyalty = isOwnTarget(targetType, target, req.user._id)
    ? undefined
    : await safeAward(req.user._id, 'SHARE', target._id);
  const counts = await getCounts(targetType, target._id);

  res.json({ success: true, sharesCount: counts?.sharesCount ?? 0, loyalty });
});

/**
 * POST /interactions/:targetType/:targetId/view   (auth optional)
 * One counted view per viewer per target per day. Owner views are ignored.
 * Set app.set('trust proxy', 1) if you're behind a proxy so req.ip is the real client.
 */
export const recordView = handle(async (req, res) => {
  const { targetType, target } = await resolveTarget(req.params.targetType, req.params.targetId);

  if (req.user && isOwnTarget(targetType, target, req.user._id)) {
    return res.json({ success: true, counted: false });
  }

  const viewerKey = req.user
    ? String(req.user._id)
    : crypto.createHash('sha256').update(`${req.ip}|${req.get('user-agent') || ''}`).digest('hex').slice(0, 32);

  const { counted } = await Interaction.recordView(targetType, target._id, viewerKey, req.user?._id);
  res.json({ success: true, counted });
});

/**
 * GET /interactions/:targetType/:targetId/stats   (auth optional)
 */
export const getStats = handle(async (req, res) => {
  const { targetType, target } = await resolveTarget(req.params.targetType, req.params.targetId);
  const counts = await getCounts(targetType, target._id);

  let isLiked = false;
  if (req.user) {
    isLiked = !!(await Interaction.exists({
      user: req.user._id, targetType, target: target._id, type: 'like',
    }));
  }

  res.json({
    success: true,
    likesCount: counts?.likesCount ?? 0,
    sharesCount: counts?.sharesCount ?? 0,
    viewsCount: counts?.viewsCount ?? 0,
    isLiked,
  });
});

/**
 * GET /interactions/me/likes?targetType=user|organization&page=1&limit=10   (auth)
 */
export const getMyLikes = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { user: req.user._id, type: 'like' };

  if (req.query.targetType) {
    const modelName = modelNameFor(req.query.targetType);
    if (!modelName) throw new HttpError(400, 'targetType must be "user" or "organization"');
    filter.targetType = modelName;
  }

  const [items, total] = await Promise.all([
    Interaction.find(filter)
      .sort('-createdAt').skip(skip).limit(limit)
      .populate('target', 'fullName role profilePicture avatar name type logo ratingAverage ratingCount')
      .lean(),
    Interaction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    items: items.filter((i) => i.target), // drop likes whose target was deleted
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/* ================================================================== */
/* REVIEWS                                                             */
/* ================================================================== */

/**
 * POST /reviews/:targetType/:targetId   (auth)
 * body: { rating, title?, comment?, appointmentId? }
 */
export const createReview = handle(async (req, res) => {
  const { targetType, target } = await resolveTarget(req.params.targetType, req.params.targetId);
  const { rating, title, comment, appointmentId } = req.body;

  if (isOwnTarget(targetType, target, req.user._id)) {
    throw new HttpError(400, "You can't review yourself or your own organization");
  }

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new HttpError(400, 'rating must be a whole number from 1 to 5');
  }

  // Look for a completed visit with this target
let appointment = null;
let attended = false;
if (targetType === 'Organization' && target.type === 'pharmacy') {
  attended = await hasBeenAttendedByPharmacy(req.user._id, target._id);
  if (!attended) throw new HttpError(403, 'You can review a pharmacy after it has attended to you');
} else {
  const apptFilter = { patient: req.user._id, status: 'completed',
    ...(targetType === 'User' ? { doctor: target._id } : { organization: target._id }) };
  if (appointmentId) {
    if (!mongoose.isValidObjectId(appointmentId)) throw new HttpError(400, 'Invalid appointmentId');
    appointment = await Appointment.findOne({ _id: appointmentId, ...apptFilter });
    if (!appointment) throw new HttpError(400, 'That appointment is not a completed visit with this provider');
  } else {
    appointment = await Appointment.findOne(apptFilter).sort('-updatedAt');
  }
}

  let review;
  try {
    review = await Review.create({
      reviewer: req.user._id,
      targetType,
      target: target._id,
      rating: numericRating,
      title,
      comment,
      appointment: appointment?._id,
      isVerifiedVisit: !!appointment,
    });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'You have already reviewed this. Edit your existing review instead.');
    throw err;
  }

  const loyalty = await safeAward(
    req.user._id,
    appointment ? 'REVIEW_VERIFIED' : 'REVIEW',
    target._id // keyed on target, so delete + re-create can't farm points
  );

  res.status(201).json({ success: true, review, loyalty });
});

/**
 * PATCH /reviews/:id   (auth, reviewer only)
 * body: { rating?, title?, comment? }
 */
export const updateReview = handle(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid review id');

  const updates = {};
  if (req.body.rating !== undefined) {
    const r = Number(req.body.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) throw new HttpError(400, 'rating must be a whole number from 1 to 5');
    updates.rating = r;
  }
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.comment !== undefined) updates.comment = req.body.comment;
  if (!Object.keys(updates).length) throw new HttpError(400, 'Nothing to update');

  const review = await Review.findOneAndUpdate(
    { _id: req.params.id, reviewer: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!review) throw new HttpError(404, 'Review not found');

  res.json({ success: true, review });
});

/**
 * DELETE /reviews/:id   (auth, reviewer or super_admin)
 */
export const deleteReview = handle(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid review id');

  const filter = MODERATOR_ROLES.includes(req.user.role)
    ? { _id: req.params.id }
    : { _id: req.params.id, reviewer: req.user._id };

  const review = await Review.findOneAndDelete(filter);
  if (!review) throw new HttpError(404, 'Review not found');

  res.json({ success: true, message: 'Review deleted' });
});

/**
 * GET /reviews/:targetType/:targetId?page=1&limit=10&rating=5&sort=recent|highest|lowest   (public)
 */
export const getTargetReviews = handle(async (req, res) => {
  const { targetType, target } = await resolveTarget(req.params.targetType, req.params.targetId);
  const { page, limit, skip } = parsePagination(req.query);

  const filter = { targetType, target: target._id, isHidden: false };
  const ratingFilter = Number(req.query.rating);
  if (Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5) filter.rating = ratingFilter;

  const sortMap = { recent: '-createdAt', highest: '-rating -createdAt', lowest: 'rating -createdAt' };
  const sort = sortMap[req.query.sort] || sortMap.recent;

  const [reviews, total, dist] = await Promise.all([
    Review.find(filter)
      .sort(sort).skip(skip).limit(limit)
      .populate('reviewer', REVIEWER_FIELDS)
      .populate('reply.repliedBy', 'fullName')
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: { targetType, target: target._id, isHidden: false } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let sum = 0;
  dist.forEach(({ _id, count: c }) => {
    distribution[_id] = c;
    count += c;
    sum += _id * c;
  });

  res.json({
    success: true,
    summary: { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution },
    reviews,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /reviews/me?page=1&limit=10   (auth)
 */
export const getMyReviews = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { reviewer: req.user._id };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort('-createdAt').skip(skip).limit(limit)
      .populate('target', 'fullName role profilePicture avatar name type logo')
      .lean(),
    Review.countDocuments(filter),
  ]);

  res.json({ success: true, reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// Can this user respond on behalf of the reviewed doctor / organization?
async function canRespond(user, review) {
  if (review.targetType === 'User') return sameId(review.target, user._id);

  const org = await Organization.findById(review.target).select('owner');
  if (!org) return false;
  return (
    sameId(org.owner, user._id) ||
    (user.role === 'hospital_admin' && user.organization && sameId(user.organization, org._id))
  );
}

/**
 * POST /reviews/:id/reply   (auth: reviewed doctor, org owner, or that org's hospital_admin)
 * body: { text }   Calling again edits the reply.
 */
export const replyToReview = handle(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid review id');

  const text = String(req.body.text || '').trim();
  if (!text) throw new HttpError(400, 'Reply text is required');
  if (text.length > 1000) throw new HttpError(400, 'Reply must be 1000 characters or fewer');

  const review = await Review.findById(req.params.id).select('targetType target isHidden');
  if (!review || review.isHidden) throw new HttpError(404, 'Review not found');
  if (!(await canRespond(req.user, review))) throw new HttpError(403, 'You cannot reply to this review');

  const updated = await Review.findByIdAndUpdate(
    review._id,
    { $set: { reply: { text, repliedBy: req.user._id, repliedAt: new Date() } } },
    { new: true }
  );

  res.json({ success: true, review: updated });
});

/**
 * PATCH /reviews/:id/visibility   (super_admin only)
 * body: { isHidden: boolean }
 */
export const moderateReview = handle(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid review id');
  if (typeof req.body.isHidden !== 'boolean') throw new HttpError(400, 'isHidden must be true or false');

  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $set: { isHidden: req.body.isHidden } },
    { new: true }
  );
  if (!review) throw new HttpError(404, 'Review not found');

  res.json({ success: true, review });
});

/* ================================================================== */
/* LOYALTY                                                             */
/* ================================================================== */

/**
 * GET /loyalty/me   (auth)
 */
export const getMyLoyalty = handle(async (req, res) => {
  const user = await User.findById(req.user._id).select('loyalty referralCode').lean();
  if (!user) throw new HttpError(404, 'User not found');

  const lifetime = user.loyalty?.lifetimePoints || 0;
  const next = TIERS.find((t) => t.min > lifetime) || null;

  res.json({
    success: true,
    points: user.loyalty?.points || 0,
    lifetimePoints: lifetime,
    tier: user.loyalty?.tier || 'bronze',
    nextTier: next ? { name: next.name, pointsNeeded: next.min - lifetime } : null,
    referralCode: user.referralCode,
  });
});

/**
 * GET /loyalty/history?page=1&limit=20   (auth)
 */
export const getLoyaltyHistory = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 100);
  const filter = { user: req.user._id };

  const [items, total] = await Promise.all([
    LoyaltyTransaction.find(filter)
      .sort('-createdAt').skip(skip).limit(limit)
      .select('action points note createdAt')
      .lean(),
    LoyaltyTransaction.countDocuments(filter),
  ]);

  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

/**
 * GET /loyalty/rules   (public)
 */
export const getLoyaltyRules = handle(async (_req, res) => {
  res.json({ success: true, rules: LOYALTY_RULES, tiers: TIERS });
});