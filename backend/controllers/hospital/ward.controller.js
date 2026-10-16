import { Ward, Bed, WARD_TYPES } from '../../models/hospital/Ward.js';
import { broadcast } from '../../services/hospitalRealtime.js';
import { ok, fail, HttpError } from '../../utils/http.js';

const findWard = async (req) => {
  const ward = await Ward.findOne({ _id: req.params.id, organization: req.orgId });
  if (!ward) throw new HttpError(404, 'Ward not found');
  return ward;
};

const announce = (orgId, action) => broadcast(orgId, 'hospital:bed', { action });

// "General Ward" -> "GEN"
const prefixOf = (name) => name.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'BED';

// Makes `count` new beds, carrying on from the numbers already used in this ward
const makeBeds = async (ward, count) => {
  const used = new Set((await Bed.find({ ward: ward._id }).select('label').lean()).map((bed) => bed.label));
  const prefix = prefixOf(ward.name);
  const beds = [];
  let number = used.size;
  while (beds.length < count) {
    number += 1;
    const label = `${prefix}-${number}`;
    if (!used.has(label)) beds.push({ organization: ward.organization, ward: ward._id, label });
  }
  return Bed.insertMany(beds);
};

const parseCount = (value, max = 100) => {
  const count = Number(value || 0);
  if (!Number.isInteger(count) || count < 0 || count > max) throw new HttpError(400, `Bed count must be a whole number from 0 to ${max}`);
  return count;
};

// GET /hospital/wards: every ward with its beds (and who is in each occupied bed)
export const listWards = async (req, res) => {
  try {
    const [wards, beds] = await Promise.all([
      Ward.find({ organization: req.orgId }).sort({ name: 1 }).lean(),
      Bed.find({ organization: req.orgId })
        .populate({ path: 'admission', select: 'patient', populate: { path: 'patient', select: 'fullName mrn' } })
        .lean(),
    ]);

    const result = wards.map((ward) => {
      const wardBeds = beds
        .filter((bed) => String(bed.ward) === String(ward._id))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      return { ...ward, beds: wardBeds };
    });
    return ok(res, result);
  } catch (error) {
    return fail(res, error, 'Could not load wards');
  }
};

// POST /hospital/wards
export const createWard = async (req, res) => {
  try {
    const { name, type = 'general', dailyRate = 0 } = req.body;
    if (!name?.trim()) throw new HttpError(400, 'Ward name is required');
    if (!WARD_TYPES.includes(type)) throw new HttpError(400, 'Unknown ward type');
    if (Number(dailyRate) < 0 || Number.isNaN(Number(dailyRate))) throw new HttpError(400, 'Daily rate must be a positive number');
    const bedCount = parseCount(req.body.bedCount);

    const ward = await Ward.create({ organization: req.orgId, name: name.trim(), type, dailyRate: Number(dailyRate) });
    if (bedCount > 0) await makeBeds(ward, bedCount);

    announce(req.orgId, 'ward-created');
    return ok(res, ward, 201);
  } catch (error) {
    return fail(res, error, 'Could not create the ward');
  }
};

// PATCH /hospital/wards/:id
export const updateWard = async (req, res) => {
  try {
    const ward = await findWard(req);
    if (req.body.name !== undefined) {
      if (!req.body.name.trim()) throw new HttpError(400, 'Ward name is required');
      ward.name = req.body.name.trim();
    }
    if (req.body.type !== undefined) {
      if (!WARD_TYPES.includes(req.body.type)) throw new HttpError(400, 'Unknown ward type');
      ward.type = req.body.type;
    }
    if (req.body.dailyRate !== undefined) {
      const rate = Number(req.body.dailyRate);
      if (Number.isNaN(rate) || rate < 0) throw new HttpError(400, 'Daily rate must be a positive number');
      ward.dailyRate = rate; // only affects future admissions: current stays keep the rate they started with
    }
    await ward.save();
    announce(req.orgId, 'ward-updated');
    return ok(res, ward);
  } catch (error) {
    return fail(res, error, 'Could not update the ward');
  }
};

// DELETE /hospital/wards/:id (only when nobody is in it)
export const deleteWard = async (req, res) => {
  try {
    const ward = await findWard(req);
    if (await Bed.exists({ ward: ward._id, status: 'occupied' })) {
      throw new HttpError(409, 'Discharge or transfer the patients in this ward first');
    }
    await Bed.deleteMany({ ward: ward._id });
    await ward.deleteOne();
    announce(req.orgId, 'ward-deleted');
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, error, 'Could not delete the ward');
  }
};

// POST /hospital/wards/:id/beds  { count }
export const addBeds = async (req, res) => {
  try {
    const ward = await findWard(req);
    const count = parseCount(req.body.count, 50);
    if (count < 1) throw new HttpError(400, 'Add at least one bed');
    await makeBeds(ward, count);
    announce(req.orgId, 'beds-added');
    return ok(res, { added: count }, 201);
  } catch (error) {
    return fail(res, error, 'Could not add beds');
  }
};

// PATCH /hospital/beds/:id  { status: 'available' | 'maintenance' }
export const setBedStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'maintenance'].includes(status)) throw new HttpError(400, 'Status must be available or maintenance');

    // The status !== 'occupied' filter means an occupied bed can never be changed by accident
    const bed = await Bed.findOneAndUpdate(
      { _id: req.params.id, organization: req.orgId, status: { $ne: 'occupied' } },
      { status },
      { new: true }
    );
    if (!bed) throw new HttpError(409, 'Bed not found, or a patient is in it');

    announce(req.orgId, 'bed-status');
    return ok(res, bed);
  } catch (error) {
    return fail(res, error, 'Could not update the bed');
  }
};

// DELETE /hospital/beds/:id
export const deleteBed = async (req, res) => {
  try {
    const bed = await Bed.findOneAndDelete({ _id: req.params.id, organization: req.orgId, status: { $ne: 'occupied' } });
    if (!bed) throw new HttpError(409, 'Bed not found, or a patient is in it');
    announce(req.orgId, 'bed-deleted');
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, error, 'Could not delete the bed');
  }
};