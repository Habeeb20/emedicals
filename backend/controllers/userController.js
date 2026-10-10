

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  User, Organization, PatientProfile, DoctorProfile, StaffProfile,
  Appointment, MedicalRecord, Prescription, LabTest, LabOrder, Medicine,
  MortuaryRecord, CemeteryPlot, BurialRecord,  
  Conversation, Message,
} from '../models/index.js';
import { sendOtp, hashOtp, OTP_MAX_ATTEMPTS } from '../utils/sendOtp.js';
import axios from 'axios';
import { Interaction } from '../models/User.js';
import { ordinal, pick, numbers, toImage, setUserImage, validateAll, saveAll, buildProfile, applyUser, applyDoctor, applyStaff, applyOrganization } from '../utils/helpers.js';
import { USER_FIELDS, DOCTOR_FIELDS, STAFF_FIELDS, ORG_FIELDS } from '../utils/helpers.js';
import { Review } from '../models/User.js';
import mongoose from 'mongoose';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_ROLES = ['patient', 'doctor', 'nurse', 'lab_tech', 'pharmacist', 'hospital_admin', 'mortuary_officer', 'cemetery_officer'];
// Roles that have a StaffProfile (everything except patient, doctor and super_admin)
const STAFF_ROLES = ['nurse', 'lab_tech', 'pharmacist', 'hospital_admin', 'mortuary_officer', 'cemetery_officer'];
const DASHBOARD_LIMIT = 50;
const EDIRECT_AUTH = 'https://auth.edirect.ng/api/auth/register';


const NO_ORGANIZATION_ROLES = ['patient', 'doctor', 'nurse'];

// Every other role runs an organization, so the organization type follows from the role.
const ORG_TYPES_BY_ROLE = {
  hospital_admin: ['hospital', 'clinic'],
  lab_tech: ['lab'],
  pharmacist: ['pharmacy'],
  mortuary_officer: ['mortuary'],
  cemetery_officer: ['cemetery'],
};

const PAYMENT_MODES = ['arrival', 'booking', 'deposit'];
const text = (v, max) => String(v ?? '').trim().slice(0, max);




export const buildOrganization = ({ role, input, ownerId, userEmail, userPhone }) => {
  const data = input && typeof input === 'object' ? input : {};

  const name = text(data.name, 120);
  if (!name) return { error: 'Organization name is required for this account type' };

  const allowedTypes = ORG_TYPES_BY_ROLE[role] || [];
  const type = data.type || allowedTypes[0];
  if (!allowedTypes.includes(type)) return { error: `Organization type must be one of: ${allowedTypes.join(', ')}` };

  const address = data.address && typeof data.address === 'object' ? data.address : {};
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    name,
    type,
    owner: ownerId,
    registrationNumber: text(data.registrationNumber, 60) || undefined,
    licenseNumber: text(data.licenseNumber, 60) || undefined,
    email: text(data.email, 120).toLowerCase() || userEmail,   // defaults to the owner's contact details
    phone: text(data.phone, 30) || userPhone,
    address: {
      street: text(address.street, 200),
      city: text(address.city, 80),
      state: text(address.state, 60),
      country: text(address.country, 60) || 'Nigeria',
    },
    about: text(data.about, 1000) || undefined,
    openingHours: text(data.openingHours, 120) || undefined,
    is24Hours: data.is24Hours === true,
    offersDelivery: data.offersDelivery === true,
    departments: [...new Set((Array.isArray(data.departments) ? data.departments : []).map((d) => text(d, 60)).filter(Boolean))].slice(0, 30),
  };

  if (data.coordinates) {
    const lat = Number(data.coordinates.lat);
    const lng = Number(data.coordinates.lng);
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return { error: 'Invalid organization coordinates' };
    doc.coordinates = { lat, lng };
  }

  // Payment settings only make sense for places patients book appointments at
  if (data.paymentSettings && ['hospital', 'clinic'].includes(type)) {
    const { mode } = data.paymentSettings;
    const appointmentFee = Number(data.paymentSettings.appointmentFee ?? 0);
    const depositAmount = Number(data.paymentSettings.depositAmount ?? 0);
    if (!PAYMENT_MODES.includes(mode)) return { error: `Payment mode must be one of: ${PAYMENT_MODES.join(', ')}` };
    if (!Number.isFinite(appointmentFee) || appointmentFee < 0 || !Number.isFinite(depositAmount) || depositAmount < 0) {
      return { error: 'Appointment fee and deposit must be positive numbers' };
    }
    if (mode === 'booking' && appointmentFee <= 0) return { error: 'Set an appointment fee to use payment on booking' };
    if (mode === 'deposit' && !(depositAmount > 0 && depositAmount < appointmentFee)) {
      return { error: 'Deposit must be more than 0 and less than the appointment fee' };
    }
    doc.paymentSettings = { mode, appointmentFee, depositAmount: mode === 'deposit' ? depositAmount : 0 };
  }

  return { doc: new Organization(doc) };
};




const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

// One place that turns any thrown error into a JSON response
const handleError = (res, err, context) => {
  console.error(`[${context}]`, err);

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map((e) => e.message).join(', ') || err.message;
    return fail(res, 400, message);
  }
  if (err.name === 'CastError') return fail(res, 400, `Invalid ${err.path}`);
  if (err.code === 11000) return fail(res, 409, 'A record with those details already exists');

  const status = err.status || err.statusCode || 500;
  const message = status >= 500 ? 'Something went wrong. Please try again.' : err.message;
  return fail(res, status, message);
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const safeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const generatePatientId = async () => {
  for (let i = 0; i < 5; i += 1) {
    const id = `EM-${crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')}`;
    if (!(await PatientProfile.exists({ patientId: id }))) return id;
  }
  return `EM-${Date.now()}`;
};

/* ------------------------------------------------------------------ */
/* POST /api/users/signup                                              */
/* ------------------------------------------------------------------ */
export const signup = async (req, res) => {
  try {
    const { fullName, phone, password, role = 'patient', gender, dateOfBirth } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!fullName || !email || !password) return fail(res, 400, 'Full name, email and password are required');
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'Please provide a valid email address');
    if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters');
    if (!SIGNUP_ROLES.includes(role)) return fail(res, 400, 'Invalid role');

    // The user and the organization point at each other, so both ids are created up front
    const userId = new mongoose.Types.ObjectId();
    const needsOrganization = !NO_ORGANIZATION_ROLES.includes(role);

    // Check the organization details BEFORE creating anything, so a bad form never leaves a half-made account
    let organization = null;
    if (needsOrganization) {
      const built = buildOrganization({ role, input: req.body.organization, ownerId: userId, userEmail: email, userPhone: phone });
      if (built.error) return fail(res, 400, built.error);
      organization = built.doc;
      try {
        await organization.validate();
      } catch (err) {
        if (err.name === 'ValidationError') return fail(res, 400, Object.values(err.errors)[0].message);
        throw err;
      }
    }

    const existing = await User.findOne({ $or: [{ email }, ...(phone ? [{ phone }] : [])] }).select('email phone');
    if (existing) {
      return fail(res, 409, existing.email === email ? 'Email is already registered' : 'Phone number is already registered');
    }

    // Anyone can register as a patient. Professional roles wait for admin approval.
    const isStaff = role !== 'patient';

    let user;
    try {
      user = await User.create({
        _id: userId, fullName, email, phone, password, role, gender, dateOfBirth,
        organization: organization?._id, isApproved: !isStaff,
      });
    } catch (err) {
      if (err.code === 11000) return fail(res, 409, 'Email or phone number is already registered');
      throw err;
    }

    if (organization) {
      try {
        await organization.save();   // starts as "pending" until an administrator approves it
      } catch (err) {
        await User.deleteOne({ _id: user._id });   // don't leave an account behind that has no organization
        throw err;
      }
    }

    if (role === 'patient') {
      await PatientProfile.create({ user: user._id, patientId: await generatePatientId() });
    }

    const otp = await sendOtp(user);

    // Mirror the account on Edirect. A failure here must not block signup.
    try {
      await axios.post(EDIRECT_AUTH, {
        platform: 'emedicals',
        full_name: fullName,
        email,
        userId: user._id.toString(),
        password,
        role: 'user',
      });
      console.log('Edirect registration successful');
    } catch (err) {
      console.error('Edirect failed:', err.response?.data || err.message);
    }

    return res.status(201).json({
      success: true,
      message: otp.sent
        ? 'Account created. We sent a verification code to your email.'
        : 'Account created, but we could not send the verification code. Please request a new one.',
      data: {
        email: user.email,
        requiresVerification: true,
        requiresApproval: isStaff,
        otpSent: otp.sent,
        ...(organization && {
          organization: { _id: organization._id, name: organization.name, type: organization.type, status: organization.status },
        }),
      },
    });
  } catch (err) {
    return handleError(res, err, 'signup');
  }
};
/* ------------------------------------------------------------------ */
/* POST /api/users/login                                               */
/* ------------------------------------------------------------------ */
export const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) return fail(res, 400, 'Email and password are required');

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) return fail(res, 401, 'Invalid email or password');
    if (!user.isActive) return fail(res, 403, 'This account has been deactivated');

    if (!user.isVerified) {
      const otp = await sendOtp(user);
      return fail(res, 403, 'Please verify your email. We sent you a new code.', {
        requiresVerification: true,
        email: user.email,
        otpSent: otp.sent,
        ...(otp.retryAfterSeconds && { retryAfterSeconds: otp.retryAfterSeconds }),
      });
    }

    if (!user.isApproved) return fail(res, 403, 'Your account is awaiting admin approval', { requiresApproval: true });

    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    return res.json({
      success: true,
      message: 'Login successful',
      data: { token: signToken(user._id), user },
    });
  } catch (err) {
    return handleError(res, err, 'login');
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/request-otp   body: { email }                       */
/* The user inputs their email and we send a fresh OTP (resend, or     */
/* passwordless login when followed by verify-otp).                    */
/* ------------------------------------------------------------------ */
export const requestEmailOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'Please provide a valid email address');

    const user = await User.findOne({ email, isActive: true }).select('email fullName');
    if (user) await sendOtp(user, { purpose: 'sign in to your account' });

    // Same response whether or not the account exists, so emails can't be probed
    return res.json({ success: true, message: 'If an account exists for that email, a code has been sent.' });
  } catch (err) {
    return handleError(res, err, 'requestEmailOtp');
  }
};

/* ------------------------------------------------------------------ */
/* POST /api/users/verify-otp   body: { email, otp }                   */
/* ------------------------------------------------------------------ */
export const verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    if (!email || !otp) return fail(res, 400, 'Email and code are required');

    const user = await User.findOne({ email }).select('+otp.codeHash +otp.expiresAt +otp.attempts');
    if (!user || !user.otp?.codeHash) return fail(res, 400, 'Invalid or expired code');
    if (!user.isActive) return fail(res, 403, 'This account has been deactivated');

    if (user.otp.expiresAt < new Date()) return fail(res, 400, 'This code has expired. Please request a new one.');
    if (user.otp.attempts >= OTP_MAX_ATTEMPTS) {
      return fail(res, 429, 'Too many wrong attempts. Please request a new code.');
    }

    if (!safeEqual(hashOtp(otp), user.otp.codeHash)) {
      await User.updateOne({ _id: user._id }, { $inc: { 'otp.attempts': 1 } });
      return fail(res, 400, 'Invalid or expired code');
    }

    // Success: mark verified and burn the code so it can't be reused
    await User.updateOne(
      { _id: user._id },
      { $set: { isVerified: true, lastLoginAt: new Date() }, $unset: { otp: 1 } }
    );

    if (!user.isApproved) {
      return res.json({
        success: true,
        message: 'Email verified. Your account is awaiting admin approval.',
        data: { requiresApproval: true },
      });
    }

    const fresh = await User.findById(user._id);
    return res.json({
      success: true,
      message: 'Verification successful',
      data: { token: signToken(fresh._id), user: fresh },
    });
  } catch (err) {
    return handleError(res, err, 'verifyOtp');
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/users/dashboard   (requires auth: sets req.user)           */
/* Everything the logged-in user owns or takes part in, across schemas */
/* ------------------------------------------------------------------ */
// Internal helper, not a route handler: errors bubble up to getDashboard's catch
const list = async (Model, filter, { sort = { createdAt: -1 }, populate = [] } = {}) => {
  let query = Model.find(filter).sort(sort).limit(DASHBOARD_LIMIT);
  populate.forEach(([path, select]) => { query = query.populate(path, select); });
  const [items, total] = await Promise.all([query.lean(), Model.countDocuments(filter)]);
  return { total, items };
};

export const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    if (!user) return fail(res, 404, 'User not found');

    // Organizations the user belongs to or owns
    const orgConditions = [{ owner: userId }];
    if (user.organization) orgConditions.push({ _id: user.organization });
    const organizations = await Organization.find({ $or: orgConditions }).lean();
    const orgIds = organizations.map((o) => o._id);

    const hasOrg = orgIds.length > 0;
    const inOrgs = (field) => (hasOrg ? { [field]: { $in: orgIds } } : null);
    const anyOf = (...conds) => ({ $or: conds.filter(Boolean) });

    const person = ['fullName avatar role'].join(' ');
    const org = 'name type logo';

    const [
      patientProfile, doctorProfile, staffProfile,
      appointments, medicalRecords, prescriptions, labOrders,
      labTests, medicines, mortuaryRecords, cemeteryPlots, burialRecords,
      reviewsWritten, reviewsReceived, interactions, conversations,
    ] = await Promise.all([
      PatientProfile.findOne({ user: userId }).lean(),
      DoctorProfile.findOne({ user: userId }).populate('organizations', org).lean(),
      StaffProfile.findOne({ user: userId }).populate('organization', org).lean(),

      list(Appointment, anyOf({ patient: userId }, { doctor: userId }, inOrgs('organization')), {
        sort: { scheduledAt: -1 },
        populate: [['patient', person], ['doctor', person], ['organization', org]],
      }),
      list(MedicalRecord, anyOf({ patient: userId }, { doctor: userId }, inOrgs('organization')), {
        populate: [['patient', person], ['doctor', person], ['organization', org]],
      }),
      list(Prescription, anyOf({ patient: userId }, { doctor: userId }, { dispensedBy: userId }, inOrgs('pharmacy')), {
        populate: [['patient', person], ['doctor', person], ['pharmacy', org]],
      }),
      list(LabOrder, anyOf({ patient: userId }, { orderedBy: userId }, { processedBy: userId }, inOrgs('lab')), {
        populate: [['patient', person], ['orderedBy', person], ['lab', org]],
      }),

      // Organization-side data (empty for users with no organization)
      hasOrg ? list(LabTest, { lab: { $in: orgIds } }) : { total: 0, items: [] },
      hasOrg ? list(Medicine, { pharmacy: { $in: orgIds } }, { sort: { name: 1 } }) : { total: 0, items: [] },
      list(MortuaryRecord, anyOf({ handledBy: userId }, inOrgs('mortuary'))),
      hasOrg ? list(CemeteryPlot, { cemetery: { $in: orgIds } }, { sort: { plotNumber: 1 } }) : { total: 0, items: [] },
      list(BurialRecord, anyOf({ recordedBy: userId }, inOrgs('cemetery'))),

      list(Review, { reviewer: userId }),
      list(
        Review,
        anyOf({ targetType: 'User', target: userId }, hasOrg ? { targetType: 'Organization', target: { $in: orgIds } } : null),
        { populate: [['reviewer', 'fullName avatar']] }
      ),
      list(Interaction, { user: userId }),

      Conversation.inboxFor(userId).limit(DASHBOARD_LIMIT).lean(),
    ]);

    // Unread counts per conversation + total
    const inbox = await Promise.all(
      conversations.map(async (c) => ({ ...c, unreadCount: await Message.unreadCount(c._id, userId) }))
    );
    const unreadTotal = inbox.reduce((sum, c) => sum + c.unreadCount, 0);

    return res.json({
      success: true,
      data: {
        user,
        profile: { patient: patientProfile, doctor: doctorProfile, staff: staffProfile },
        organizations,
        appointments,
        medicalRecords,
        prescriptions,
        labOrders,
        labTests,
        medicines,
        mortuaryRecords,
        cemeteryPlots,
        burialRecords,
        reviews: { written: reviewsWritten, received: reviewsReceived },
        interactions,
        chat: { total: inbox.length, unread: unreadTotal, conversations: inbox },
        engagement: {
          likes: user.likesCount, views: user.viewsCount, shares: user.sharesCount,
          ratingAverage: user.ratingAverage, ratingCount: user.ratingCount,
        },
        note: `Each list returns up to the ${DASHBOARD_LIMIT} most recent items; "total" is the full count.`,
      },
    });
  } catch (err) {
    return handleError(res, err, 'getDashboard');
  }
};

/* ------------------------------------------------------------------ */
/* GET /api/users                                                      */
/* ------------------------------------------------------------------ */
export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    const filter = { role: { $ne: 'super_admin' } };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -otp')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return handleError(res, err, 'getAllUsers');
  }
};

/* ------------------------------------------------------------------ */
/* Profile handlers                                                    */
/* ------------------------------------------------------------------ */
export const getMyProfile = async (req, res) => {
  try {
    return res.json(await buildProfile(req.user._id));
  } catch (err) {
    return handleError(res, err, 'getMyProfile');
  }
};

// Body: { user: {...}, profile: {...}, organization: {...} }, every section optional
export const updateMyProfile = async (req, res) => {
  try {
    const { user: u, profile: p, organization: o } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, 'User not found');

    const docs = [user];
    if (u) applyUser(user, u);
    if (p) {
      if (user.role === 'doctor') docs.push(await applyDoctor(user, p));
      else if (STAFF_ROLES.includes(user.role)) docs.push(await applyStaff(user, p));
      else return fail(res, 400, 'Your role has no professional profile');
    }
    if (o) docs.push(await applyOrganization(user, o));

    await validateAll(docs);
    await saveAll(docs);
    return res.json(await buildProfile(user._id));
  } catch (err) {
    return handleError(res, err, 'updateMyProfile');
  }
};

// Quick photo change. Body: { avatar: "<cloudinary url>" } or { profilePicture: "<cloudinary url>" }; null removes it
export const updateMyAvatar = async (req, res) => {
  try {
    if (req.body.avatar === undefined && req.body.profilePicture === undefined) {
      return fail(res, 400, 'Send avatar or profilePicture');
    }
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, 'User not found');

    setUserImage(user, req.body);
    await user.save();
    return res.json(await buildProfile(user._id));
  } catch (err) {
    return handleError(res, err, 'updateMyAvatar');
  }
};