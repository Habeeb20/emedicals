import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Organization from '../models/Organization.js';
import { asyncHandler, AppError, rx } from '../utils/helpers.js';
import { haversineKm, round1, attachTravel, centroidFor, geocodeAddress } from '../services/location.service.js';
import Interaction from '../models/Interaction.js';
import { PAYMENT_MODES } from '../models/Appointment.js';

const BOOKABLE_ORGS = ['hospital', 'clinic'];

async function resolveOrigin(req) {
  const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };       // device GPS
  const u = req.user;
  if (u?.coordinates?.lat != null) return u.coordinates;                    // saved from address
  return centroidFor(u?.state, u?.lga);                                     // LGA / state centroid
}

// In production only approved/active records are public. In dev you see everything in the database.
const PROD = process.env.NODE_ENV === 'production';
const orgFilter = PROD ? { status: 'approved' } : {};
const engagementOf = (d) => ({ likes: d.likesCount || 0, shares: d.sharesCount || 0, views: d.viewsCount || 0 });

async function findDoctors({ q, department }) {
  // Start from USERS with role doctor, so a doctor still shows up even if no DoctorProfile exists yet
  const userFilter = { role: 'doctor', ...(PROD && { isActive: true, isApproved: true }) };
  if (q) userFilter.fullName = rx(q);
  const users = await User.find(userFilter)
    .select('fullName avatar profilePicture state lga coordinates organization likesCount sharesCount viewsCount')
    .populate('organization', 'name coordinates address status')
    .limit(500).lean();
  if (!users.length) return [];

  const profiles = await DoctorProfile.find({ user: { $in: users.map((u) => u._id) } })
    .populate('organizations', 'name coordinates address status').lean();
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));
  const deptRx = department ? rx(department) : null;

  return users.map((u) => {
    const p = byUser.get(String(u._id));
    if (deptRx && !(p && deptRx.test(p.specialization))) return null;

    const orgs = [...(p?.organizations || []), ...(u.organization ? [u.organization] : [])]
      .filter((o, i, arr) => o && arr.findIndex((x) => String(x._id) === String(o._id)) === i)
      .filter((o) => !PROD || o.status === 'approved');
    const coords = orgs.find((o) => o.coordinates?.lat != null)?.coordinates || u.coordinates || null;

    return {
      kind: 'doctor', id: u._id, name: u.fullName,
      avatar: u.avatar?.url ? u.avatar : u.profilePicture ? { url: u.profilePicture } : undefined,
      department: p?.specialization || 'General practice',
      yearsOfExperience: p?.yearsOfExperience, bio: p?.bio, isAvailableOnline: !!p?.isAvailableOnline,
      fee: p?.paymentSettings?.appointmentFee ?? p?.consultationFee ?? 0,
      paymentMode: p?.paymentSettings?.mode || 'arrival',
      hospitals: orgs.map((o) => ({ id: o._id, name: o.name })),
      state: u.state, lga: u.lga, coords,
      profileComplete: !!p,
      engagement: engagementOf(u),
    };
  }).filter(Boolean);
}

async function findHospitals({ q, department }) {
  const orgs = await Organization.find({
    type: { $in: BOOKABLE_ORGS }, ...orgFilter,
    ...(q && { name: rx(q) }),
    ...(department && { departments: rx(department) }),
  }).limit(300).lean();
  return orgs.map((o) => ({
    kind: 'hospital', id: o._id, name: o.name, type: o.type, logo: o.logo, address: o.address,
    departments: o.departments || [], fee: o.paymentSettings?.appointmentFee ?? 0,
    paymentMode: o.paymentSettings?.mode || 'arrival', coords: o.coordinates || null,
    status: o.status, engagement: engagementOf(o),
  }));
}

/** Which of these targets has the signed-in user liked? */
async function attachLiked(userId, items) {
  if (!userId || !items.length) return;
  const liked = new Set((await Interaction.find({
    user: userId, type: 'like', target: { $in: items.map((i) => i.id) },
  }).select('target').lean()).map((l) => String(l.target)));
  items.forEach((i) => { i.likedByMe = liked.has(String(i.id)); });
}

/** GET /providers?type=all|doctor|hospital&q=&department=&lat=&lng=&maxKm=&page=&limit= */
export const listProviders = asyncHandler(async (req, res) => {
  const { type = 'all', q, department, maxKm } = req.query;
  const page = Math.max(1, +req.query.page || 1);
  const limit = Math.min(50, +req.query.limit || 10);
  const origin = await resolveOrigin(req);

  let items = [];
  if (type === 'all' || type === 'doctor') items.push(...(await findDoctors({ q, department })));
  if (type === 'all' || type === 'hospital') items.push(...(await findHospitals({ q, department })));

  if (origin) {
    // cheap straight-line pass for all, accurate road route only for the visible page
    items.forEach((i) => { i.distanceKm = i.coords ? round1(haversineKm(origin, i.coords)) : null; });
    if (maxKm) items = items.filter((i) => i.distanceKm != null && i.distanceKm <= +maxKm);
    items.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  } else {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  const total = items.length;
  const pageItems = items.slice((page - 1) * limit, page * limit);
  await Promise.all([origin && attachTravel(origin, pageItems), attachLiked(req.user?._id, pageItems)]);

  res.json({ status: 'success', data: pageItems, meta: { total, page, limit, origin: origin || null } });
});

export const getDoctor = asyncHandler(async (req, res) => {
  const profile = await DoctorProfile.findOne({ user: req.params.id })
    .populate('user', 'fullName avatar state lga').populate('organizations', 'name address').lean();
  if (!profile) throw new AppError('Doctor not found', 404);
  res.json({ status: 'success', data: profile });
});

export const getHospital = asyncHandler(async (req, res) => {
  const org = await Organization.findOne({ _id: req.params.id, type: { $in: BOOKABLE_ORGS }, status: 'approved' }).lean();
  if (!org) throw new AppError('Hospital not found', 404);
  const profiles = await DoctorProfile.find({ organizations: org._id }).populate('user', 'fullName avatar').lean();
  res.json({ status: 'success', data: { ...org, doctors: profiles.map((p) => ({ id: p.user._id, name: p.user.fullName, department: p.specialization })) } });
});

/** PATCH /providers/me/settings  — doctor: own profile · hospital_admin: own organization */
export const updateMySettings = asyncHandler(async (req, res) => {
  const { mode, appointmentFee, depositAmount, departments, address } = req.body;

  const payment = {};
  if (mode !== undefined) {
    if (!PAYMENT_MODES.includes(mode)) throw new AppError(`mode must be one of ${PAYMENT_MODES.join(', ')}`);
    payment.mode = mode;
  }
  if (appointmentFee !== undefined) {
    if (!(+appointmentFee >= 0)) throw new AppError('appointmentFee must be >= 0');
    payment.appointmentFee = +appointmentFee;
  }
  if (depositAmount !== undefined) payment.depositAmount = +depositAmount;
  if (payment.mode === 'deposit' && !(payment.depositAmount > 0)) throw new AppError('depositAmount is required for deposit mode');
  if (payment.depositAmount && payment.appointmentFee && payment.depositAmount > payment.appointmentFee)
    throw new AppError('depositAmount cannot exceed appointmentFee');

  const set = {};
  Object.entries(payment).forEach(([k, v]) => { set[`paymentSettings.${k}`] = v; });

  if (req.user.role === 'doctor') {
    const profile = await DoctorProfile.findOneAndUpdate({ user: req.user._id }, { $set: set }, { new: true });
    if (!profile) throw new AppError('Create your doctor profile first', 404);
    return res.json({ status: 'success', data: profile });
  }

  if (req.user.role === 'hospital_admin' || req.user.role === 'super_admin') {
    const orgId = req.user.role === 'super_admin' ? req.body.organizationId : req.user.organization;
    if (Array.isArray(departments)) set.departments = departments.map((d) => String(d).trim()).filter(Boolean);
    if (address) {
      set.address = address; // { street, city, state, country }
      const coords = await geocodeAddress([address.street, address.city, address.state, 'Nigeria'].filter(Boolean).join(', '))
        || (await centroidFor(address.state, address.city));
      if (coords) set.coordinates = coords;
    }
    const org = await Organization.findByIdAndUpdate(orgId, { $set: set }, { new: true });
    if (!org) throw new AppError('Organization not found', 404);
    return res.json({ status: 'success', data: org });
  }
  throw new AppError('Not allowed', 403);
});

/** GET /providers/departments — for the patient filter dropdown */
export const listDepartments = asyncHandler(async (_req, res) => {
  const [specs, orgDepts] = await Promise.all([DoctorProfile.distinct('specialization'), Organization.distinct('departments')]);
  const all = [...new Set([...specs, ...orgDepts].filter(Boolean))].sort();
  res.json({ status: 'success', data: all });
});