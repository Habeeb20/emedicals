import mongoose from 'mongoose';
import Organization from '../../models/Organization.js';
import User from '../../models/User.js';
import PatientRecord from '../../models/hospital/PatientRecord.js';
import Visit from '../../models/hospital/Visit.js';
import Admission from '../../models/hospital/Admission.js';
import { nextNumber } from '../../models/hospital/Counter.js';
import { broadcast } from '../../services/hospitalRealtime.js';
import { distanceKm } from '../../utils/geo.js';
import { ok, fail, HttpError, escapeRegex, toList } from '../../utils/http.js';

const HOSPITAL_TYPES = ['hospital', 'clinic'];
const OPEN_STATUSES = ['waiting', 'triaged', 'in_consultation'];

// Only these Organization fields are ever sent to the public. Add your engagement fields (rating, likes) here if you want them shown.
const PUBLIC_FIELDS =
  'name type address logo departments about openingHours is24Hours offersDelivery coordinates phone email licenseNumber paymentSettings.mode paymentSettings.appointmentFee createdAt';

// Case-insensitive "exactly this word" match, so "lagos" finds "Lagos"
const exact = (text) => new RegExp(`^${escapeRegex(String(text).trim())}$`, 'i');
const contains = (text) => new RegExp(escapeRegex(String(text).trim()), 'i');

const findHospital = async (id) => {
  const org = await Organization.findOne({ _id: id, status: 'approved', type: { $in: HOSPITAL_TYPES } });
  if (!org) throw new HttpError(404, 'Hospital not found');
  return org;
};

/* ------------------------------------------------------------------ */
/* Public: browse hospitals                                            */
/* ------------------------------------------------------------------ */

// GET /hospital/directory?q=&state=&lga=&city=&department=&type=&is24Hours=&sort=&lat=&lng=&page=&limit=
export const listHospitals = async (req, res) => {
  try {
    const { q, state, lga, city, department, type, is24Hours, sort = 'name' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 12));

    const filter = { status: 'approved', type: { $in: HOSPITAL_TYPES } };
    if (HOSPITAL_TYPES.includes(type)) filter.type = type;
    if (state) filter['address.state'] = exact(state);
    if (lga) filter['address.lga'] = exact(lga);
    if (city) filter['address.city'] = contains(city);
    if (department) filter.departments = exact(department); // whole-name match on ANY listed department (so "ENT" does not match "Dentistry")
    if (is24Hours === 'true') filter.is24Hours = true;
    if (q?.trim()) {
      const pattern = contains(q);
      filter.$or = [{ name: pattern }, { 'address.street': pattern }, { 'address.city': pattern }, { departments: pattern }];
    }

    // "Nearest first" needs the distance worked out for every match, so it is sorted in memory
    const here = { lat: Number(req.query.lat), lng: Number(req.query.lng) };
    const hasLocation = Number.isFinite(here.lat) && Number.isFinite(here.lng) && req.query.lat !== '' && req.query.lng !== '';

    if (sort === 'nearest' && hasLocation) {
      const all = await Organization.find(filter).select(PUBLIC_FIELDS).limit(500).lean();
      const withDistance = all
        .map((org) => ({ ...org, distanceKm: org.coordinates?.lat != null ? Math.round(distanceKm(here, org.coordinates) * 10) / 10 : null }))
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      const items = withDistance.slice((page - 1) * limit, page * limit);
      return ok(res, { items, total: all.length, page, pages: Math.max(1, Math.ceil(all.length / limit)) });
    }

    const order = sort === 'newest' ? { createdAt: -1 } : { name: 1 };
    const [items, total] = await Promise.all([
      Organization.find(filter).select(PUBLIC_FIELDS).sort(order).skip((page - 1) * limit).limit(limit).lean(),
      Organization.countDocuments(filter),
    ]);

    if (hasLocation) {
      items.forEach((org) => {
        org.distanceKm = org.coordinates?.lat != null ? Math.round(distanceKm(here, org.coordinates) * 10) / 10 : null;
      });
    }
    return ok(res, { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    return fail(res, error, 'Could not load hospitals');
  }
};

// GET /hospital/directory/filters: the choices that fill the filter drop-downs
export const getFilterOptions = async (req, res) => {
  try {
    const base = { status: 'approved', type: { $in: HOSPITAL_TYPES } };
    const [states, departments, pairs] = await Promise.all([
      Organization.distinct('address.state', base),
      Organization.distinct('departments', base),
      Organization.aggregate([{ $match: base }, { $group: { _id: '$address.state', lgas: { $addToSet: '$address.lga' } } }]),
    ]);

    const clean = (list) => [...new Set(list.filter(Boolean).map((v) => String(v).trim()))].sort((a, b) => a.localeCompare(b));
    const lgas = {};
    pairs.forEach((row) => { if (row._id) lgas[row._id] = clean(row.lgas); });

    return ok(res, { states: clean(states), departments: clean(departments), lgas });
  } catch (error) {
    return fail(res, error, 'Could not load the filters');
  }
};

// GET /hospital/directory/:id: everything the public may know about one hospital
export const getHospital = async (req, res) => {
  try {
    const org = await Organization.findOne({ _id: req.params.id, status: 'approved', type: { $in: HOSPITAL_TYPES } })
      .select(PUBLIC_FIELDS)
      .lean();
    if (!org) throw new HttpError(404, 'Hospital not found');

    const activeStaff = { isActive: { $ne: false }, isApproved: { $ne: false } };
    const [staffCounts, doctors] = await Promise.all([
      User.aggregate([
        { $match: { organization: org._id, role: { $in: ['doctor', 'nurse', 'lab_tech', 'pharmacist'] }, ...activeStaff } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      findDoctors(org._id, activeStaff),
    ]);

    return ok(res, {
      ...org,
      staffCounts: Object.fromEntries(staffCounts.map((row) => [row._id, row.count])),
      doctors,
    });
  } catch (error) {
    return fail(res, error, 'Could not load the hospital');
  }
};

// Doctors who work here: employed by the hospital, or listing it in their DoctorProfile.
// DoctorProfile is read only if that model exists, so this still works if you rename or remove it.
async function findDoctors(orgId, activeStaff) {
  const Profile = mongoose.models.DoctorProfile;
  let listedIds = [];
  if (Profile) {
    try {
      listedIds = (await Profile.find({ organizations: orgId }).select('user').lean()).map((p) => p.user);
    } catch (error) {
      console.error('DoctorProfile lookup failed:', error.message);
    }
  }

  const users = await User.find({ role: 'doctor', ...activeStaff, $or: [{ organization: orgId }, { _id: { $in: listedIds } }] })
    .select('fullName')
    .sort({ fullName: 1 })
    .limit(60)
    .lean();

  let profiles = {};
  if (Profile && users.length) {
    try {
      const rows = await Profile.find({ user: { $in: users.map((u) => u._id) } }).select('user specialization consultationFee isAvailableOnline').lean();
      profiles = Object.fromEntries(rows.map((p) => [String(p.user), p]));
    } catch (error) {
      console.error('DoctorProfile lookup failed:', error.message);
    }
  }

  return users.map((u) => ({
    _id: u._id,
    fullName: u.fullName,
    specialization: profiles[String(u._id)]?.specialization,
    consultationFee: profiles[String(u._id)]?.consultationFee,
    isAvailableOnline: profiles[String(u._id)]?.isAvailableOnline,
  }));
}

/* ------------------------------------------------------------------ */
/* Patient: join a hospital and interact with it                       */
/* ------------------------------------------------------------------ */

// GET /hospital/directory/:id/me: where this patient stands with this hospital
export const myStatusAtHospital = async (req, res) => {
  try {
    const record = await PatientRecord.findOne({ organization: req.params.id, user: req.user._id }).lean();
    if (!record) return ok(res, { registered: false });

    const [openVisit, admission] = await Promise.all([
      Visit.findOne({ patient: record._id, status: { $in: OPEN_STATUSES } }).select('visitNumber status complaint source createdAt').lean(),
      Admission.findOne({ patient: record._id, status: 'admitted' }).populate('ward', 'name').populate('bed', 'label').select('ward bed admittedAt').lean(),
    ]);

    // Place in the queue: how many open visits (not in consultation) are ahead of this one
    let queuePosition = null;
    if (openVisit && openVisit.status !== 'in_consultation') {
      const mine = await Visit.findById(openVisit._id).select('queueRank createdAt').lean();
      queuePosition = 1 + (await Visit.countDocuments({
        organization: req.params.id,
        status: { $in: ['waiting', 'triaged'] },
        $or: [{ queueRank: { $lt: mine.queueRank } }, { queueRank: mine.queueRank, createdAt: { $lt: mine.createdAt } }],
      }));
    }

    return ok(res, { registered: true, mrn: record.mrn, openVisit, queuePosition, admission });
  } catch (error) {
    return fail(res, error, 'Could not load your status');
  }
};

// POST /hospital/directory/:id/register: the patient registers themself at this hospital
export const registerWithHospital = async (req, res) => {
  try {
    const org = await findHospital(req.params.id);

    // Already registered: just return the record (safe to press the button twice)
    const existing = await PatientRecord.findOne({ organization: org._id, user: req.user._id });
    if (existing) return ok(res, existing);

    // The hospital may already have a file for this person, made by staff using the same email. Claim it instead of duplicating.
    if (req.user.email) {
      const unlinked = await PatientRecord.findOne({ organization: org._id, email: req.user.email.toLowerCase(), user: { $exists: false } });
      if (unlinked) {
        unlinked.user = req.user._id;
        await unlinked.save();
        broadcast(org._id, 'hospital:patient', { action: 'linked', id: unlinked._id }, req.user._id);
        return ok(res, unlinked);
      }
    }

    const { gender, dateOfBirth, phone, address, bloodGroup, genotype, allergies, nextOfKin } = req.body;
    if (!gender) throw new HttpError(400, 'Gender is required');

    try {
      const record = await PatientRecord.create({
        organization: org._id,
        user: req.user._id,
        mrn: await nextNumber(`mrn:${org._id}`, 'MRN'),
        fullName: req.user.fullName,
        email: req.user.email,
        phone: phone || req.user.phone,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        address,
        bloodGroup,
        genotype,
        allergies: toList(allergies),
        nextOfKin,
        registeredBy: req.user._id,
      });
      broadcast(org._id, 'hospital:patient', { action: 'self-registered', id: record._id }, req.user._id);
      return ok(res, record, 201);
    } catch (error) {
      // Two taps at the same moment: the unique index stops the second one, so return the first record
      if (error.code === 11000) {
        const again = await PatientRecord.findOne({ organization: org._id, user: req.user._id });
        if (again) return ok(res, again);
      }
      throw error;
    }
  } catch (error) {
    return fail(res, error, 'Could not register you at this hospital');
  }
};

// POST /hospital/directory/:id/request-visit  { complaint }: the patient joins the hospital's queue from the app
export const requestVisit = async (req, res) => {
  try {
    const org = await findHospital(req.params.id);
    const complaint = String(req.body.complaint || '').trim();
    if (!complaint) throw new HttpError(400, 'Tell the hospital what you are coming for');

    const record = await PatientRecord.findOne({ organization: org._id, user: req.user._id });
    if (!record) throw new HttpError(409, 'Register with this hospital first');
    if (await Visit.exists({ patient: record._id, status: { $in: OPEN_STATUSES } })) {
      throw new HttpError(409, 'You already have an open visit at this hospital');
    }

    const visit = await Visit.create({
      organization: org._id,
      patient: record._id,
      visitNumber: await nextNumber(`visit:${org._id}`, 'V'),
      complaint,
      source: 'patient',
      createdBy: req.user._id,
    });

    broadcast(org._id, 'hospital:visit', { action: 'requested', id: visit._id }, req.user._id);
    return ok(res, visit, 201);
  } catch (error) {
    return fail(res, error, 'Could not send your visit request');
  }
};