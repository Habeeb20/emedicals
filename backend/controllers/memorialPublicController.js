import crypto from 'crypto';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import CemeteryPlot from '../models/CemeteryPlot.js';
import MemorialBooking from '../models/MemorialBooking.js';
import User, { Interaction, Review } from '../models/User.js';
import { MEMORIAL_TYPES, wrap, HttpError, escapeRegex, haversineKm, paginate, mortuaryOccupancy } from './memorialHelpers.js';

const LIST_FIELDS =
  'name type address logo coordinates about openingHours is24Hours likesCount sharesCount viewsCount ratingAverage ratingCount memorial.storageRatePerDay memorial.capacity memorial.bookingsOpen createdAt';

const findPublicOrg = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Listing not found');
  const org = await Organization.findOne({ _id: id, status: 'approved', type: { $in: MEMORIAL_TYPES } });
  if (!org) throw new HttpError(404, 'This listing was not found or is not approved yet');
  return org;
};

const likedSet = async (user, ids) => {
  if (!user || !ids.length) return new Set();
  const rows = await Interaction.find({ user: user._id, type: 'like', targetType: 'Organization', target: { $in: ids } })
    .select('target')
    .lean();
  return new Set(rows.map((r) => String(r.target)));
};

/* ------------------------------ DIRECTORY ------------------------------ */
// GET /memorial/orgs?type=&q=&state=&city=&sort=popular|rating|newest|name|nearest&lat=&lng=&is24Hours=&minRating=&page=
export const listOrgs = wrap(async (req, res) => {
  const { type, q, state, city, sort = 'popular', lat, lng, is24Hours, minRating } = req.query;
  const { page, limit, skip } = paginate(req.query, 12);

  const filter = { status: 'approved', type: MEMORIAL_TYPES.includes(type) ? type : { $in: MEMORIAL_TYPES } };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { 'address.city': rx }, { 'address.street': rx }, { 'address.state': rx }];
  }
  if (state) filter['address.state'] = new RegExp(`^${escapeRegex(state)}$`, 'i');
  if (city) filter['address.city'] = new RegExp(escapeRegex(city), 'i');
  if (is24Hours === 'true') filter.is24Hours = true;
  if (minRating) filter.ratingAverage = { $gte: Number(minRating) };

  const hasGeo = lat !== undefined && lng !== undefined && !Number.isNaN(+lat) && !Number.isNaN(+lng);
  let items;
  let total;

  if (sort === 'nearest' && hasGeo) {
    const all = await Organization.find({ ...filter, 'coordinates.lat': { $exists: true } })
      .select(LIST_FIELDS)
      .limit(500)
      .lean();
    all.forEach((o) => (o.distanceKm = haversineKm(+lat, +lng, o.coordinates.lat, o.coordinates.lng)));
    all.sort((a, b) => a.distanceKm - b.distanceKm);
    total = all.length;
    items = all.slice(skip, skip + limit);
  } else {
    const sortMap = {
      popular: { likesCount: -1, viewsCount: -1, ratingAverage: -1 },
      rating: { ratingAverage: -1, ratingCount: -1 },
      newest: { createdAt: -1 },
      name: { name: 1 },
    };
    [items, total] = await Promise.all([
      Organization.find(filter).select(LIST_FIELDS).sort(sortMap[sort] || sortMap.popular).skip(skip).limit(limit).lean(),
      Organization.countDocuments(filter),
    ]);
    if (hasGeo) items.forEach((o) => o.coordinates?.lat != null && (o.distanceKm = haversineKm(+lat, +lng, o.coordinates.lat, o.coordinates.lng)));
  }

  // cemetery cards show how many plots are open and the starting price
  const cemIds = items.filter((i) => i.type === 'cemetery').map((i) => i._id);
  const plotRows = cemIds.length
    ? await CemeteryPlot.aggregate([
        { $match: { cemetery: { $in: cemIds }, status: 'available' } },
        { $group: { _id: '$cemetery', available: { $sum: 1 }, fromPrice: { $min: '$price' } } },
      ])
    : [];
  const plotMap = new Map(plotRows.map((r) => [String(r._id), r]));
  const liked = await likedSet(req.user, items.map((i) => i._id));

  items.forEach((o) => {
    o.liked = liked.has(String(o._id));
    const p = plotMap.get(String(o._id));
    if (p) {
      o.availablePlots = p.available;
      o.fromPrice = p.fromPrice;
    }
  });

  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

/* ------------------------------- PROFILE -------------------------------- */
// GET /memorial/orgs/:id
export const getOrg = wrap(async (req, res) => {
  const org = await findPublicOrg(req.params.id);
  const data = org.toObject();
  delete data.owner;

  const stats = {};
  if (org.type === 'cemetery') {
    const rows = await CemeteryPlot.aggregate([
      { $match: { cemetery: org._id } },
      { $group: { _id: '$status', n: { $sum: 1 }, minPrice: { $min: '$price' } } },
    ]);
    const by = (s) => rows.find((r) => r._id === s)?.n || 0;
    stats.plots = {
      available: by('available'),
      reserved: by('reserved'),
      occupied: by('occupied'),
      total: rows.reduce((a, r) => a + r.n, 0),
      fromPrice: rows.find((r) => r._id === 'available')?.minPrice ?? null,
    };
  } else {
    stats.occupancy = await mortuaryOccupancy(org);
  }
  stats.familiesServed = await MemorialBooking.countDocuments({ organization: org._id, status: 'completed' });

  const reviewRows = await Review.aggregate([
    { $match: { targetType: 'Organization', target: org._id, isHidden: false } },
    { $group: { _id: '$rating', n: { $sum: 1 } } },
  ]);
  const ratingBreakdown = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: reviewRows.find((x) => x._id === r)?.n || 0 }));

  const liked = (await likedSet(req.user, [org._id])).has(String(org._id));
  res.json({ success: true, org: data, stats, ratingBreakdown, liked });
});

// GET /memorial/orgs/:id/plots?section=&type=&status=&maxPrice=
export const getOrgPlots = wrap(async (req, res) => {
  const org = await findPublicOrg(req.params.id);
  if (org.type !== 'cemetery') throw new HttpError(400, 'Only cemeteries have plots');
  const { section, type, status, maxPrice } = req.query;
  const filter = { cemetery: org._id };
  if (section) filter.section = section;
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (maxPrice) filter.price = { $lte: Number(maxPrice) };

  const plots = await CemeteryPlot.find(filter)
    .select('-reservedBy -booking')
    .collation({ locale: 'en', numericOrdering: true })
    .sort({ section: 1, plotNumber: 1 })
    .limit(600)
    .lean();
  const sections = [...new Set(plots.map((p) => p.section).filter(Boolean))];
  res.json({ success: true, plots, sections });
});

/* ----------------------- VIEW / LIKE / SHARE ---------------------------- */
// POST /memorial/orgs/:id/view   (guests allowed; one counted view per viewer per day)
export const recordView = wrap(async (req, res) => {
  const org = await findPublicOrg(req.params.id);
  const viewerKey = req.user
    ? String(req.user._id)
    : crypto.createHash('sha256').update(`${req.ip}|${req.headers['user-agent'] || ''}`).digest('hex').slice(0, 32);
  const result = await Interaction.recordView('Organization', org._id, viewerKey, req.user?._id);
  res.json({ success: true, ...result });
});

// POST /memorial/orgs/:id/like   (toggle)
export const toggleLike = wrap(async (req, res) => {
  const org = await findPublicOrg(req.params.id);
  const { liked } = await Interaction.toggleLike(req.user._id, 'Organization', org._id);
  let points = 0;
  if (liked) points = (await User.awardPoints(req.user._id, 'LIKE', String(org._id)).catch(() => ({ awarded: 0 }))).awarded;
  const fresh = await Organization.findById(org._id).select('likesCount');
  res.json({ success: true, liked, likesCount: fresh?.likesCount ?? 0, pointsAwarded: points });
});

// POST /memorial/orgs/:id/share   { channel }
export const recordShare = wrap(async (req, res) => {
  const org = await findPublicOrg(req.params.id);
  const channels = ['whatsapp', 'facebook', 'x', 'email', 'copy_link', 'other'];
  const channel = channels.includes(req.body.channel) ? req.body.channel : 'other';
  await Interaction.recordShare(req.user?._id, 'Organization', org._id, channel);
  let points = 0;
  if (req.user) points = (await User.awardPoints(req.user._id, 'SHARE', String(org._id)).catch(() => ({ awarded: 0 }))).awarded;
  const fresh = await Organization.findById(org._id).select('sharesCount');
  res.json({ success: true, sharesCount: fresh?.sharesCount ?? 0, pointsAwarded: points });
});

/* -------------------------------- REVIEWS ------------------------------- */
// GET /memorial/orgs/:id/reviews?page=&sort=recent|high|low
export const listReviews = wrap(async (req, res) => {
  const org = await findPublicOrg(req.params.id);
  const { page, limit, skip } = paginate(req.query, 8);
  const filter = { targetType: 'Organization', target: org._id, isHidden: false };
  const sortMap = { recent: { createdAt: -1 }, high: { rating: -1, createdAt: -1 }, low: { rating: 1, createdAt: -1 } };

  const [items, total, mine] = await Promise.all([
    Review.find(filter)
      .populate('reviewer', 'fullName avatar profilePicture')
      .populate('reply.repliedBy', 'fullName')
      .sort(sortMap[req.query.sort] || sortMap.recent)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    req.user ? Review.findOne({ reviewer: req.user._id, targetType: 'Organization', target: org._id }).lean() : null,
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit), mine });
});

// POST /memorial/orgs/:id/reviews   { rating, title, comment }  (creates or edits your review)
export const upsertReview = wrap(async (req, res) => {
  const org = await findPublicOrg(req.params.id);
  if (String(org.owner) === String(req.user._id)) throw new HttpError(403, 'You cannot review your own facility');

  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Choose a rating from 1 to 5');

  const verified = !!(await MemorialBooking.exists({ client: req.user._id, organization: org._id, status: 'completed' }));
  let review = await Review.findOne({ reviewer: req.user._id, targetType: 'Organization', target: org._id });
  const isNew = !review;

  if (!review) review = new Review({ reviewer: req.user._id, targetType: 'Organization', target: org._id });
  review.rating = rating;
  review.title = req.body.title;
  review.comment = req.body.comment;
  review.isVerifiedVisit = verified;
  await review.save(); // post-save hook recalculates the facility rating

  let points = 0;
  if (isNew) {
    points = (await User.awardPoints(req.user._id, verified ? 'REVIEW_VERIFIED' : 'REVIEW', String(org._id)).catch(() => ({ awarded: 0 }))).awarded;
  }
  res.status(isNew ? 201 : 200).json({ success: true, review, pointsAwarded: points });
});

// DELETE /memorial/reviews/:id  (your own review)
export const deleteMyReview = wrap(async (req, res) => {
  const doc = await Review.findOneAndDelete({ _id: req.params.id, reviewer: req.user._id });
  if (!doc) throw new HttpError(404, 'Review not found');
  res.json({ success: true });
});
