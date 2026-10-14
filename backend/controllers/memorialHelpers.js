import Organization from '../models/Organization.js';
import MortuaryRecord from '../models/MortuaryRecord.js';
import MemorialBooking from '../models/MemorialBooking.js';

export const MEMORIAL_TYPES = ['mortuary', 'cemetery'];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wraps a handler so thrown errors become tidy JSON responses (no separate error middleware needed).
export const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ success: false, message: err.message });
    if (err.name === 'ValidationError')
      return res.status(400).json({ success: false, message: Object.values(err.errors).map((e) => e.message).join(', ') });
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'That record already exists' });
    console.error('[memorial]', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const paginate = (query, defLimit = 12) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || defLimit, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

export const haversineKm = (lat1, lng1, lat2, lng2) => {
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

// The mortuary/cemetery organization the logged-in officer runs.
export const getMyOrg = async (req) => {
  const type = req.user.role === 'mortuary_officer' ? 'mortuary' : req.user.role === 'cemetery_officer' ? 'cemetery' : null;
  if (!type) throw new HttpError(403, 'This area is for mortuary and cemetery officers');
  const ownership = [{ owner: req.user._id }];
  if (req.user.organization) ownership.push({ _id: req.user.organization });
  const org = await Organization.findOne({ type, $or: ownership });
  if (!org) throw new HttpError(404, 'No organization is linked to your account yet');
  return org;
};

export const isOrgManager = (user, org) =>
  ['mortuary_officer', 'cemetery_officer'].includes(user.role) &&
  (String(org.owner) === String(user._id) || String(user.organization) === String(org._id));

// Beds/slots in use at a mortuary: bodies in care + confirmed bookings still to arrive.
export const mortuaryOccupancy = async (org) => {
  const [inCare, reserved] = await Promise.all([
    MortuaryRecord.countDocuments({ mortuary: org._id, status: { $in: ['admitted', 'embalmed'] } }),
    MemorialBooking.countDocuments({ organization: org._id, kind: 'mortuary', status: 'confirmed' }),
  ]);
  const used = inCare + reserved;
  const capacity = org.memorial?.capacity || 0;
  return { inCare, reserved, used, capacity, available: capacity ? Math.max(capacity - used, 0) : null };
};
