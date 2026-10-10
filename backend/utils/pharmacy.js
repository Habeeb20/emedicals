import mongoose from 'mongoose';
import { HttpError } from './engagement.js';
import { AuditLog } from '../models/Pharmacy.js';
import Organization from '../models/Organization.js';


// Express middleware wrapper (async errors go to your error handler)
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const positiveInt = (v, label = 'Quantity') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${label} must be a whole number above 0`);
  return n;
};

export const nonNegInt = (v, label = 'Quantity') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new HttpError(400, `${label} must be a whole number, 0 or more`);
  return n;
};

export const money = (v, label = 'Amount') => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `${label} must be 0 or more`);
  return Math.round(n * 100) / 100;
};

export const objectId = (v, label = 'id') => {
  if (!mongoose.isValidObjectId(v)) throw new HttpError(400, `Invalid ${label}`);
  return v;
};

export const pick = (src = {}, keys) =>
  Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));

// Defaults to the last 30 days. Dates are read as UTC days.
export function dateRange(q = {}) {
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 29 * 864e5);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new HttpError(400, 'Invalid date range');
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
}

// Runs fn inside a MongoDB transaction. Needs a replica set (Atlas has one by default).
export async function withTx(fn) {
  const session = await mongoose.startSession();
  try {
    let out;
    await session.withTransaction(async () => { out = await fn(session); });
    return out;
  } finally {
    await session.endSession();
  }
}

export const audit = (req, action, entity, entityId, meta = {}, session) => {
  const p = AuditLog.create(
    [{ pharmacy: req.pharmacy._id, user: req.user._id, action, entity, entityId, meta }],
    session ? { session } : undefined
  );
  return session ? p : p.catch(() => {}); // an audit hiccup should never block the main action
};




export const pharmacyStaff = wrap(async (req, _res, next) => {
  const u = req.user;
  if (!u || u.role !== 'pharmacist' || !u.organization) throw new HttpError(403, 'Pharmacy staff only');

  const org = await Organization.findById(u.organization).select('name type owner status');
  if (!org || org.type !== 'pharmacy') throw new HttpError(403, 'Your account is not linked to a pharmacy');
  if (org.status !== 'approved') throw new HttpError(403, 'Your pharmacy is awaiting approval');

  req.pharmacy = org;
  req.isManager = sameId(org.owner, u._id);
  next();
});

export const requireManager = (req, _res, next) =>
  req.isManager ? next() : next(new HttpError(403, 'Only the pharmacy manager can do this'));