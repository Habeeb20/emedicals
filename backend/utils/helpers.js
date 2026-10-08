import {
  User, Organization, PatientProfile, DoctorProfile, StaffProfile,
  Appointment, MedicalRecord, Prescription, LabTest, LabOrder, Medicine,
  MortuaryRecord, CemeteryPlot, BurialRecord, Review, Interaction,
  Conversation, Message,
} from '../models/index.js';

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const rx = (s) => new RegExp(escapeRegex(String(s).trim()), 'i');

// "YYYY-MM-DD" in Nigerian time
export const todayLagos = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });

export const weekdayKey = (yyyyMmDd) =>
  new Date(`${yyyyMmDd}T12:00:00+01:00`)
    .toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Africa/Lagos' })
    .toLowerCase()
    .slice(0, 3); // mon, tue ...

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;







/* ---------- helpers ---------- */
export const STAFF_ROLES = ['nurse', 'lab_tech', 'pharmacist', 'mortuary_officer', 'cemetery_officer'];

export const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
export const pick = (o = {}, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Turns '' / null into "not provided" for numeric fields and checks the rest
export const numbers = (data, keys) => keys.forEach((k) => {
  if (!(k in data)) return;
  if (data[k] === '' || data[k] === null) return delete data[k];
  const n = Number(data[k]);
  if (!Number.isFinite(n) || n < 0) fail(400, `${k} must be a positive number`);
  data[k] = n;
});

/**
 * Cloudinary image input. Accepts a URL string (what the frontend sends) or { url, publicId }.
 * Returns { url, publicId }, null (remove the image) or undefined (not provided).
 * Only URLs from your own Cloudinary account are accepted (set CLOUDINARY_CLOUD_NAME on the server to enforce it).
 */
export const toImage = (input) => {
  if (input === undefined) return undefined;
  if (input === null || input === '') return null;
  const raw = typeof input === 'string' ? input : input.url;
  if (typeof raw !== 'string' || !raw.startsWith('https://res.cloudinary.com/')) fail(400, 'Image must be a Cloudinary URL');
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (cloud && !raw.startsWith(`https://res.cloudinary.com/${cloud}/`)) fail(400, 'Image must come from this app\'s Cloudinary account');
  const url = raw.split('?')[0];
  let publicId = typeof input === 'object' ? input.publicId : undefined;
  if (!publicId) {
    const parts = (url.split('/upload/')[1] || '').split('/');
    const v = parts.findIndex((p) => /^v\d+$/.test(p)); // skip transformations and version
    publicId = parts.slice(v >= 0 ? v + 1 : 0).join('/').replace(/\.[^/.]+$/, '');
  }
  return { url, publicId };
};

// avatar and profilePicture are the same thing: whichever is sent, both are kept in sync
export const setUserImage = (user, body) => {
  const img = toImage(body.avatar !== undefined ? body.avatar : body.profilePicture);
  if (img === undefined) return;
  user.avatar = img || undefined;
  user.profilePicture = img ? img.url : undefined;
};

export const validateAll = async (docs) => {
  try { await Promise.all(docs.map((d) => d.validate())); }
  catch (e) { if (e.name === 'ValidationError') fail(400, Object.values(e.errors)[0].message); throw e; }
};
export const saveAll = async (docs) => {
  try { await Promise.all(docs.map((d) => d.save())); }
  catch (e) { if (e.code === 11000) fail(409, 'That phone number is already in use'); throw e; }
};

/* ---------- response ---------- */
export const buildProfile = async (userId) => {
  const user = await User.findById(userId);
  let profile = null;
  let profileType = null;
  if (user.role === 'doctor') {
    profileType = 'doctor';
    profile = await DoctorProfile.findOne({ user: userId }).populate('organizations', 'name type address');
  } else if (STAFF_ROLES.includes(user.role)) {
    profileType = 'staff';
    profile = await StaffProfile.findOne({ user: userId });
  }
  const organization = user.organization ? await Organization.findById(user.organization) : null;
  const canEditOrganization = !!organization && (user.role === 'hospital_admin' || String(organization.owner) === String(user._id));
  return {
    user: { ...user.toJSON(), profilePicture: user.profilePicture || user.avatar?.url || null },
    profileType, profile, organization, canEditOrganization,
  };
};

/* ---------- field rules ---------- */
export const USER_FIELDS = ['fullName', 'phone', 'gender', 'dateOfBirth', 'state', 'lga', 'address', 'prescriptionPublic'];
export const DOCTOR_FIELDS = ['specialization', 'licenseNumber', 'yearsOfExperience', 'bio', 'consultationFee', 'availability', 'isAvailableOnline'];
export const STAFF_FIELDS = ['designation', 'department', 'licenseNumber', 'employeeId'];
export const ORG_FIELDS = ['name', 'registrationNumber', 'licenseNumber', 'email', 'phone'];

export const applyUser = (user, body) => {
  const data = pick(body, USER_FIELDS);
  for (const k of ['gender', 'dateOfBirth']) if (data[k] === '') delete data[k];
  if ('phone' in data) data.phone = data.phone || undefined; // '' would collide on the unique index
  user.set(data);
  if (body.coordinates) {
    const { lat, lng } = body.coordinates;
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) fail(400, 'Invalid coordinates');
    user.coordinates = { lat, lng };
  }
  setUserImage(user, body);
};

export const applyDoctor = async (user, body) => {
  const doc = (await DoctorProfile.findOne({ user: user._id })) || new DoctorProfile({ user: user._id });
  const data = pick(body, DOCTOR_FIELDS);
  numbers(data, ['yearsOfExperience', 'consultationFee']);
  if (data.availability) {
    if (!Array.isArray(data.availability)) fail(400, 'availability must be a list');
    for (const s of data.availability) {
      if (!HHMM.test(s.start) || !HHMM.test(s.end) || s.start >= s.end) fail(400, 'Each availability slot needs valid times (HH:MM) with the start before the end');
    }
  }
  doc.set(data);
  return doc;
};

export const applyStaff = async (user, body) => {
  if (!user.organization) fail(400, 'Your account is not linked to an organization yet');
  const doc = (await StaffProfile.findOne({ user: user._id })) || new StaffProfile({ user: user._id, organization: user.organization });
  doc.set(pick(body, STAFF_FIELDS));
  return doc;
};

export const applyOrganization = async (user, body) => {
  const org = user.organization && (await Organization.findById(user.organization));
  if (!org || !(user.role === 'hospital_admin' || String(org.owner) === String(user._id))) fail(403, 'You cannot edit this organization');
  org.set(pick(body, ORG_FIELDS));
  for (const k of ['street', 'city', 'state', 'country']) if (body.address?.[k] !== undefined) org.set(`address.${k}`, body.address[k]);
  if (Array.isArray(body.departments)) org.departments = [...new Set(body.departments.map((d) => String(d).trim()).filter(Boolean))];
  const logo = toImage(body.logo);
  if (logo !== undefined) org.logo = logo || undefined;
  return org;
};
