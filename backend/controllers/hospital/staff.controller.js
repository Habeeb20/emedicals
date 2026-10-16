import User from '../../models/User.js';
import Organization from '../../models/Organization.js';

import { broadcast, tellUser } from '../../services/hospitalRealtime.js';
import { ok, fail, HttpError } from '../../utils/http.js';

const MANAGED_ROLES = ['doctor', 'nurse', 'lab_tech', 'pharmacist', 'hospital_admin'];
const FIELDS = 'fullName email phone role isApproved isActive lastLoginAt';

// GET /hospital/staff: everyone who belongs to this hospital
export const listStaff = async (req, res) => {
  try {
    const staff = await User.find({ organization: req.orgId, role: { $in: MANAGED_ROLES } }).select(FIELDS).sort({ fullName: 1 }).lean();
    return ok(res, staff);
  } catch (error) {
    return fail(res, error, 'Could not load staff');
  }
};

// PATCH /hospital/staff/:id  { isApproved?, isActive? }: approve a new account, or switch one off/on
export const updateStaff = async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.isApproved === 'boolean') updates.isApproved = req.body.isApproved;
    if (typeof req.body.isActive === 'boolean') updates.isActive = req.body.isActive;
    if (!Object.keys(updates).length) throw new HttpError(400, 'Nothing to update');

    const target = await User.findOne({ _id: req.params.id, organization: req.orgId, role: { $in: MANAGED_ROLES } }).select('_id');
    if (!target) throw new HttpError(404, 'Staff member not found');
    if (String(target._id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own account here');

    const org = await Organization.findById(req.orgId).select('owner');
    if (String(org?.owner) === String(target._id)) throw new HttpError(400, 'The hospital owner account cannot be changed');

    const staff = await User.findByIdAndUpdate(target._id, { $set: updates }, { new: true }).select(FIELDS);

    broadcast(req.orgId, 'hospital:staff', { action: 'updated', id: staff._id }, staff._id);
    if (updates.isApproved === true) await tellUser(staff._id, 'Your account was approved', 'You can now use the hospital dashboard.');
    return ok(res, staff);
  } catch (error) {
    return fail(res, error, 'Could not update the staff member');
  }
};