import Organization from '../models/Organization.js';
import { Interaction, Review } from '../models/User.js';
import { HttpError, handle, parsePagination } from '../utils/engagement.js';
import { escapeRegex, objectId } from '../utils/pharmacy.js';
import { hasBeenAttendedByPharmacy } from '../services/pharmacyAttendance.service.js';

const CARD_FIELDS =
  'name logo address phone coordinates about openingHours is24Hours offersDelivery ' +
  'ratingAverage ratingCount likesCount sharesCount viewsCount';

const SORTS = {
  rating: '-ratingAverage -ratingCount',
  likes: '-likesCount',
  views: '-viewsCount',
  newest: '-createdAt',
};

const km = (a, b) => {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

async function likedSet(user, ids) {
  if (!user || !ids.length) return new Set();
  const likes = await Interaction.find({ user: user._id, type: 'like', targetType: 'Organization', target: { $in: ids } })
    .select('target').lean();
  return new Set(likes.map((l) => String(l.target)));
}

/**
 * GET /pharmacies?q=&state=&sort=rating|likes|views|newest|nearest&lat=&lng=&page=&limit=   (public, optional auth)
 */
export const listPharmacies = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 50);
  const filter = { type: 'pharmacy', status: 'approved' };
  const q = String(req.query.q || '').trim();
  if (q) filter.name = new RegExp(escapeRegex(q), 'i');
  if (req.query.state) filter['address.state'] = new RegExp(`^${escapeRegex(String(req.query.state).trim())}$`, 'i');

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const nearest = req.query.sort === 'nearest' && Number.isFinite(lat) && Number.isFinite(lng);

  let items;
  let total;
  if (nearest) {
    // Pharmacy counts are modest, so sorting by distance in memory is fine
    const all = await Organization.find(filter).select(CARD_FIELDS).limit(500).lean();
    const withDistance = all
      .map((o) => ({ ...o, distanceKm: o.coordinates?.lat != null ? Math.round(km({ lat, lng }, o.coordinates) * 10) / 10 : null }))
      .sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
    total = withDistance.length;
    items = withDistance.slice(skip, skip + limit);
  } else {
    [items, total] = await Promise.all([
      Organization.find(filter).sort(SORTS[req.query.sort] || SORTS.rating).skip(skip).limit(limit).select(CARD_FIELDS).lean(),
      Organization.countDocuments(filter),
    ]);
  }

  const liked = await likedSet(req.user, items.map((o) => o._id));
  res.json({
    success: true,
    data: items.map((o) => ({ ...o, isLiked: liked.has(String(o._id)) })),
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/**
 * GET /pharmacies/:id   (public, optional auth)
 * Also tells the signed-in user whether they may review (they must have been attended to first).
 */
export const getPharmacy = handle(async (req, res) => {
  objectId(req.params.id, 'pharmacy id');
  const org = await Organization.findOne({ _id: req.params.id, type: 'pharmacy', status: 'approved' })
    .select(`${CARD_FIELDS} email licenseNumber`).lean();
  if (!org) throw new HttpError(404, 'Pharmacy not found');

  let isLiked = false;
  let canReview = false;
  let myReview = null;
  if (req.user) {
    const [liked, attended, mine] = await Promise.all([
      likedSet(req.user, [org._id]),
      hasBeenAttendedByPharmacy(req.user._id, org._id),
      Review.findOne({ reviewer: req.user._id, targetType: 'Organization', target: org._id }).lean(),
    ]);
    isLiked = liked.has(String(org._id));
    myReview = mine;
    canReview = attended && !mine;
  }
  res.json({ success: true, data: { ...org, isLiked, canReview, myReview, hasAttended: canReview || !!myReview } });
});