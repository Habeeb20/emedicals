import mongoose from 'mongoose';
import User, { ROLES } from '../models/User.js';
import Organization from '../models/Organization.js';

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (res, code, message) => res.status(code).json({ success: false, message });

/** Loads :id user; super admins can never be modified through these endpoints. */
const loadUser = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid id'), null;
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, 'User not found'), null;
  if (user.role === 'super_admin') return fail(res, 403, 'Super admin accounts cannot be modified'), null;
  return user;
};

const loadOrg = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid id'), null;
  const org = await Organization.findById(req.params.id);
  if (!org) return fail(res, 404, 'Organization not found'), null;
  return org;
};

// ---------- Dashboard ----------
export const getStats = wrap(async (_req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalUsers, pendingUsers, blockedUsers, newThisWeek, byRole, orgByStatus, pendingOrgs] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isApproved: false }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Organization.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Organization.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).select('name type createdAt'),
    ]);

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, pending: pendingUsers, blocked: blockedUsers, newThisWeek },
      byRole: Object.fromEntries(byRole.map((r) => [r._id, r.count])),
      organizations: Object.fromEntries(orgByStatus.map((r) => [r._id, r.count])),
      pendingOrganizations: pendingOrgs,
    },
  });
});

// ---------- Users ----------
export const listUsers = wrap(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
  const { search, role, status } = req.query;

  const filter = {};
  if (role && ROLES.includes(role)) filter.role = role;
  if (status === 'pending') filter.isApproved = false;
  if (status === 'blocked') filter.isActive = false;
  if (status === 'active') Object.assign(filter, { isActive: true, isApproved: true });
  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('organization', 'name type status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

export const getUser = wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid id');
  const user = await User.findById(req.params.id).populate('organization');
  if (!user) return fail(res, 404, 'User not found');
  res.json({ success: true, data: user });
});

const setFlags = (flags, message) =>
  wrap(async (req, res) => {
    const user = await loadUser(req, res);
    if (!user) return;
    Object.assign(user, flags);
    await user.save();
    res.json({ success: true, message, data: user });
  });

export const approveUser = setFlags({ isApproved: true }, 'Account approved');
export const rejectUser = setFlags({ isApproved: false }, 'Account approval revoked');
export const blockUser = setFlags({ isActive: false }, 'Account blocked');
export const unblockUser = setFlags({ isActive: true }, 'Account unblocked');

export const changeRole = wrap(async (req, res) => {
  const { role } = req.body;
  if (!ROLES.includes(role) || role === 'super_admin') return fail(res, 400, 'Invalid role');
  const user = await loadUser(req, res);
  if (!user) return;
  user.role = role;
  await user.save();
  res.json({ success: true, message: 'Role updated', data: user });
});

export const deleteUser = wrap(async (req, res) => {
  const user = await loadUser(req, res);
  if (!user) return;
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted' });
});

// ---------- Organizations ----------
export const listOrganizations = wrap(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
  const { search, status, type } = req.query;

  const filter = {};
  if (['pending', 'approved', 'suspended'].includes(status)) filter.status = status;
  if (type) filter.type = type;
  if (search) filter.name = new RegExp(escapeRegex(search.trim()), 'i');

  const [orgs, total] = await Promise.all([
    Organization.find(filter)
      .populate('owner', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Organization.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: orgs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

export const approveOrganization = wrap(async (req, res) => {
  const org = await loadOrg(req, res);
  if (!org) return;
  org.status = 'approved';
  await org.save();
  // Approving the organization also approves its owner so they can log in
  await User.updateOne({ _id: org.owner }, { isApproved: true });
  res.json({ success: true, message: 'Organization approved', data: org });
});

const setOrgStatus = (status, message) =>
  wrap(async (req, res) => {
    const org = await loadOrg(req, res);
    if (!org) return;
    org.status = status;
    await org.save();
    res.json({ success: true, message, data: org });
  });

export const suspendOrganization = setOrgStatus('suspended', 'Organization suspended');
export const reinstateOrganization = setOrgStatus('approved', 'Organization reinstated');