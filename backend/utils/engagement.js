import mongoose from 'mongoose';
import User, {REVIEWABLE_ROLES} from '../models/User.js';

import '../models/Organization.js'; // make sure the model is registered

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap an async controller: no try/catch needed inside it
export const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({
      success: false,
      message: err.status ? err.message : 'Something went wrong',
    });
  }
};

export const sameId = (a, b) => String(a) === String(b);

const TYPE_MAP = {
  user: 'User',
  doctor: 'User',
  organization: 'Organization',
  org: 'Organization',
};
export const modelNameFor = (param) => TYPE_MAP[String(param || '').toLowerCase()];

// Validates the :targetType/:targetId pair and loads the target
export async function resolveTarget(typeParam, id) {
  const targetType = modelNameFor(typeParam);
  if (!targetType) throw new HttpError(400, 'targetType must be "user" or "organization"');
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid target id');

  const Model = mongoose.model(targetType);
  const target = await Model.findById(id).select(
    targetType === 'User' ? 'role isActive isApproved' : 'status owner'
  );
  if (!target) throw new HttpError(404, 'Not found');

  if (targetType === 'User' && (!REVIEWABLE_ROLES.includes(target.role) || !target.isActive || !target.isApproved)) {
    throw new HttpError(404, 'Not found');
  }
  if (targetType === 'Organization' && target.status !== 'approved') {
    throw new HttpError(404, 'Not found');
  }
  return { targetType, target };
}

// Is the current user the target itself (or the owner of the target organization)?
export const isOwnTarget = (targetType, target, userId) =>
  targetType === 'User' ? sameId(target._id, userId) : sameId(target.owner, userId);

// Loyalty must never break the main action
export async function safeAward(userId, action, refId) {
  try {
    return await User.awardPoints(userId, action, refId);
  } catch (err) {
    console.error('Loyalty award failed:', err.message);
    return { awarded: 0, reason: 'error' };
  }
}

export const parsePagination = (query, maxLimit = 50) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};