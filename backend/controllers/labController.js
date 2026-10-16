import crypto from 'crypto';
import mongoose from 'mongoose';
import LabTest from '../models/LabTest.js';
import LabOrder from '../models/LabOrder.js';
import Organization from '../models/Organization.js';
import User, { Interaction, Review } from '../models/User.js';
import { escapeRegex } from './memorialHelpers.js';
const STAFF = ['lab_tech', 'hospital_admin'];
const isId = (id) => mongoose.isValidObjectId(id);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const serverError = (res, err) => res.status(500).json({ message: err.message });



// no 0/O/1/I so numbers are easy to read out over the phone
const ORDER_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const nextLabOrderNumber = async () => {
  const day = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // e.g. 261016
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Array.from(crypto.randomBytes(5), (b) => ORDER_CHARS[b % ORDER_CHARS.length]).join('');
    const orderNumber = `LAB-${day}-${suffix}`;
    if (!(await LabOrder.exists({ orderNumber }))) return orderNumber;
  }
  throw new Error('Could not generate an order number. Please try again.');
};

// Returns the signed-in staff member's approved lab, or null
const getStaffLab = async (req) => {
  if (!STAFF.includes(req.user.role) || !req.user.organization) return null;
  const lab = await Organization.findById(req.user.organization);
  if (!lab || lab.type !== 'lab' || lab.status !== 'approved') return null;
  return lab;
};

// Patient who owns the order, the doctor who ordered it, or staff of that lab
const canViewOrder = (order, user) => {
  const uid = String(user._id);
  return (
    String(order.patient._id) === uid ||
    (order.orderedBy && String(order.orderedBy._id) === uid) ||
    (STAFF.includes(user.role) && String(user.organization) === String(order.lab._id))
  );
};

/* ================= BROWSE LABS ================= */

export const listLabs = async (req, res) => {
  try {
    const { q, state, city, sort } = req.query;

    const filter = { type: 'lab', status: 'approved' };
    if (q) filter.name = { $regex: esc(q), $options: 'i' };
    if (state) filter['address.state'] = { $regex: `^${esc(state)}$`, $options: 'i' };
    if (city) filter['address.city'] = { $regex: `^${esc(city)}$`, $options: 'i' };

    const sorts = {
      top: { ratingAverage: -1, ratingCount: -1 },
      views: { viewsCount: -1 },
      likes: { likesCount: -1 },
      name: { name: 1 },
    };

    const labs = await Organization.find(filter)
      .select('name address phone logo coordinates about openingHours is24Hours offersDelivery likesCount sharesCount viewsCount ratingAverage ratingCount')
      .sort(sorts[sort] || sorts.name)
      .limit(60)
      .lean();

    // number of active tests per lab
    const counts = await LabTest.aggregate([
      { $match: { lab: { $in: labs.map((l) => l._id) }, isActive: true } },
      { $group: { _id: '$lab', n: { $sum: 1 } } },
    ]);
    labs.forEach((lab) => {
      const found = counts.find((c) => String(c._id) === String(lab._id));
      lab.testsCount = found ? found.n : 0;
    });

    res.json({ labs });
  } catch (err) {
    serverError(res, err);
  }
};

export const getLab = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Lab not found' });

    const lab = await Organization.findOne({ _id: req.params.id, type: 'lab', status: 'approved' })
      .select('-owner -__v')
      .lean();
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const tests = await LabTest.find({ lab: lab._id, isActive: true }).sort('category name').lean();

    // has the signed-in user liked this lab?
    let liked = false;
    if (req.user) {
      const like = await Interaction.exists({ user: req.user._id, targetType: 'Organization', target: lab._id, type: 'like' });
      liked = !!like;
    }

    res.json({ lab: { ...lab, liked }, tests });
  } catch (err) {
    serverError(res, err);
  }
};

export const listLabTests = async (req, res) => {
  try {
    if (!isId(req.params.labId)) return res.status(404).json({ message: 'Lab not found' });

    const lab = await Organization.findOne({ _id: req.params.labId, type: 'lab', status: 'approved' })
      .select('name address phone logo');
    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    const filter = { lab: lab._id, isActive: true };
    if (req.query.q) filter.name = { $regex: esc(req.query.q), $options: 'i' };

    const tests = await LabTest.find(filter).sort('category name');
    res.json({ lab, tests });
  } catch (err) {
    serverError(res, err);
  }
};

/* ================= VIEWS, LIKES, SHARES ================= */

// Guests allowed. The same viewer is counted once per day.
export const recordLabView = async (req, res) => {
  try {
    const labId = req.params.id;
    if (!isId(labId)) return res.status(404).json({ message: 'Lab not found' });

    const viewerKey = req.user
      ? String(req.user._id)
      : crypto.createHash('sha256').update(`${req.ip}|${req.get('user-agent') || ''}`).digest('hex');

    const { counted } = await Interaction.recordView('Organization', labId, viewerKey, req.user?._id);
    const lab = await Organization.findById(labId).select('viewsCount');

    res.json({ counted, viewsCount: lab.viewsCount });
  } catch (err) {
    serverError(res, err);
  }
};

// Login required
export const toggleLabLike = async (req, res) => {
  try {
    const labId = req.params.id;
    if (!isId(labId)) return res.status(404).json({ message: 'Lab not found' });

    const { liked } = await Interaction.toggleLike(req.user._id, 'Organization', labId);
    if (liked) await User.awardPoints(req.user._id, 'LIKE', labId);

    const lab = await Organization.findById(labId).select('likesCount');
    res.json({ liked, likesCount: lab.likesCount });
  } catch (err) {
    serverError(res, err);
  }
};

// Guests allowed
export const shareLab = async (req, res) => {
  try {
    const labId = req.params.id;
    if (!isId(labId)) return res.status(404).json({ message: 'Lab not found' });

    const channels = ['whatsapp', 'facebook', 'x', 'email', 'copy_link', 'other'];
    const channel = channels.includes(req.body.channel) ? req.body.channel : 'other';

    await Interaction.recordShare(req.user?._id, 'Organization', labId, channel);
    if (req.user) await User.awardPoints(req.user._id, 'SHARE', `${labId}:${channel}`);

    const lab = await Organization.findById(labId).select('sharesCount');
    res.json({ sharesCount: lab.sharesCount });
  } catch (err) {
    serverError(res, err);
  }
};

/* ================= REVIEWS ================= */

export const listLabReviews = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Lab not found' });

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const filter = { targetType: 'Organization', target: req.params.id, isHidden: false };

    const reviews = await Review.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reviewer', 'fullName avatar profilePicture')
      .lean();
    const total = await Review.countDocuments(filter);

    res.json({ reviews, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    serverError(res, err);
  }
};

// Creates the user's review, or edits it if they already reviewed this lab
export const saveLabReview = async (req, res) => {
  try {
    const labId = req.params.id;
    if (!isId(labId)) return res.status(404).json({ message: 'Lab not found' });

    const lab = await Organization.findOne({ _id: labId, type: 'lab', status: 'approved' }).select('owner');
    if (!lab) return res.status(404).json({ message: 'Lab not found' });
    if (String(lab.owner) === String(req.user._id)) {
      return res.status(403).json({ message: 'You cannot review your own lab' });
    }

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // verified visit = the user has a completed order at this lab
    const visit = await LabOrder.findOne({ patient: req.user._id, lab: labId, status: 'completed' }).select('_id');

    let review = await Review.findOne({ reviewer: req.user._id, targetType: 'Organization', target: labId });
    const isNew = !review;
    if (isNew) review = new Review({ reviewer: req.user._id, targetType: 'Organization', target: labId });

    review.rating = rating;
    review.title = req.body.title;
    review.comment = req.body.comment;
    if (visit) review.isVerifiedVisit = true;
    await review.save();

    await Review.calcRatings('Organization', labId); // refresh average so the response is current
    if (isNew) await User.awardPoints(req.user._id, visit ? 'REVIEW_VERIFIED' : 'REVIEW', labId);

    const updated = await Organization.findById(labId).select('ratingAverage ratingCount');
    await review.populate('reviewer', 'fullName avatar profilePicture');

    res.status(isNew ? 201 : 200).json({
      review,
      ratingAverage: updated.ratingAverage,
      ratingCount: updated.ratingCount,
    });
  } catch (err) {
    serverError(res, err);
  }
};

export const deleteMyLabReview = async (req, res) => {
  try {
    const labId = req.params.id;
    if (!isId(labId)) return res.status(404).json({ message: 'Lab not found' });

    await Review.findOneAndDelete({ reviewer: req.user._id, targetType: 'Organization', target: labId });
    await Review.calcRatings('Organization', labId);

    const lab = await Organization.findById(labId).select('ratingAverage ratingCount');
    res.json({ ratingAverage: lab.ratingAverage, ratingCount: lab.ratingCount });
  } catch (err) {
    serverError(res, err);
  }
};

/* ================= ORDERS (patient / doctor / walk-in) ================= */

export const createOrder = async (req, res) => {
  try {
    const { testIds, labId, patientId } = req.body;
    const { role } = req.user;

    if (!Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one test' });
    }

    let lab = labId;
    let patient = req.user._id;
    let orderedBy;

    if (role === 'doctor' || STAFF.includes(role)) {
      // doctor or lab staff ordering for a patient
      if (!isId(patientId)) return res.status(400).json({ message: 'A valid patientId is required' });
      const found = await User.findOne({ _id: patientId, role: 'patient' });
      if (!found) return res.status(404).json({ message: 'Patient not found' });
      patient = found._id;

      if (role === 'doctor') {
        orderedBy = req.user._id;
      } else {
        const staffLab = await getStaffLab(req);
        if (!staffLab) return res.status(403).json({ message: 'Only approved lab staff can do this' });
        lab = staffLab._id;
      }
    } else if (role !== 'patient') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    if (!isId(lab)) return res.status(400).json({ message: 'A valid labId is required' });
    const labDoc = await Organization.findOne({ _id: lab, type: 'lab', status: 'approved' });
    if (!labDoc) return res.status(404).json({ message: 'Lab not found' });

    const ids = [...new Set(testIds.map(String))];
    if (!ids.every(isId)) return res.status(400).json({ message: 'Invalid test selected' });

    const tests = await LabTest.find({ _id: { $in: ids }, lab: labDoc._id, isActive: true });
    if (tests.length !== ids.length) {
      return res.status(400).json({ message: 'One or more tests are no longer available' });
    }

    const items = tests.map((t) => ({
      test: t._id,
      testName: t.name,
      price: t.price,
      referenceRange: t.referenceRange,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.price, 0);
    const orderNumber = `LAB-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const order = await LabOrder.create({ patient, orderedBy, lab: labDoc._id, orderNumber, items, totalAmount });
    res.status(201).json({ order });
  } catch (err) {
    serverError(res, err);
  }
};

export const myOrders = async (req, res) => {
  try {
    const filter = { patient: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const orders = await LabOrder.find(filter).populate('lab', 'name address').sort('-createdAt').limit(100);
    res.json({ orders });
  } catch (err) {
    serverError(res, err);
  }
};

export const getOrder = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Order not found' });

    const order = await LabOrder.findById(req.params.id)
      .populate('lab', 'name address phone logo')
      .populate('patient', 'fullName email phone gender dateOfBirth')
      .populate('orderedBy', 'fullName');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!canViewOrder(order, req.user)) return res.status(403).json({ message: 'Not allowed' });

    res.json({ order });
  } catch (err) {
    serverError(res, err);
  }
};

export const cancelOrder = async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Order not found' });

    const order = await LabOrder.findById(req.params.id)
      .populate('lab', 'name')
      .populate('patient', 'fullName')
      .populate('orderedBy', 'fullName');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!canViewOrder(order, req.user)) return res.status(403).json({ message: 'Not allowed' });

    const isPatient = String(order.patient._id) === String(req.user._id);
    if (!isPatient && !STAFF.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Order is already ${order.status}` });
    }
    if (isPatient && order.status !== 'ordered') {
      return res.status(400).json({ message: 'The sample has been collected. Please contact the lab to cancel.' });
    }

    order.status = 'cancelled';
    if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
    await order.save();

    res.json({ order });
  } catch (err) {
    serverError(res, err);
  }
};

/* ================= LAB STAFF: TEST CATALOG ================= */

const TEST_FIELDS = ['name', 'code', 'category', 'price', 'sampleType', 'turnaroundHours', 'referenceRange', 'isActive'];

// copy only the allowed fields from the request body
const testData = (body) => {
  const data = {};
  TEST_FIELDS.forEach((field) => {
    if (body[field] !== undefined) data[field] = body[field];
  });
  return data;
};

export const staffListTests = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });

    const tests = await LabTest.find({ lab: lab._id }).sort('category name');
    res.json({ tests });
  } catch (err) {
    console.log(err)
    serverError(res, err);
  }
};

export const staffCreateTest = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });

    const test = await LabTest.create({ ...testData(req.body), lab: lab._id });
    res.status(201).json({ test });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A test with this name already exists' });
    serverError(res, err);
  }
};

export const staffUpdateTest = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Test not found' });

    const test = await LabTest.findOneAndUpdate(
      { _id: req.params.id, lab: lab._id },
      testData(req.body),
      { new: true, runValidators: true }
    );
    if (!test) return res.status(404).json({ message: 'Test not found' });

    res.json({ test });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A test with this name already exists' });
    serverError(res, err);
  }
};

// Soft delete so old orders keep their reference
export const staffDeleteTest = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Test not found' });

    const test = await LabTest.findOneAndUpdate(
      { _id: req.params.id, lab: lab._id },
      { isActive: false },
      { new: true }
    );
    if (!test) return res.status(404).json({ message: 'Test not found' });

    res.json({ test });
  } catch (err) {
    serverError(res, err);
  }
};

/* ================= LAB STAFF: ORDER WORKFLOW ================= */

// Finds an order that belongs to the staff member's lab (or null)
const findStaffOrder = async (req, lab) => {
  if (!isId(req.params.id)) return null;
  return LabOrder.findOne({ _id: req.params.id, lab: lab._id });
};

export const staffListOrders = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });

    const filter = { lab: lab._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) filter.orderNumber = { $regex: esc(req.query.q), $options: 'i' };

    const orders = await LabOrder.find(filter).populate('patient').sort('-createdAt').limit(100);
    const grouped = await LabOrder.aggregate([
      { $match: { lab: lab._id } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);

    const counts = {};
    grouped.forEach((g) => { counts[g._id] = g.n; });

    res.json({ orders, counts });
  } catch (err) {
    serverError(res, err);
  }
};

export const collectSample = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });

    const order = await findStaffOrder(req, lab);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'ordered') {
      return res.status(400).json({ message: 'Sample can only be collected for new orders' });
    }

    order.status = 'sample_collected';
    order.collectedAt = new Date();
    await order.save();

    res.json({ order });
  } catch (err) {
    serverError(res, err);
  }
};

export const saveResults = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });

    const order = await findStaffOrder(req, lab);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['sample_collected', 'processing'].includes(order.status)) {
      return res.status(400).json({ message: 'Collect the sample before entering results' });
    }

    for (const entry of req.body.items || []) {
      const item = order.items.id(entry.itemId);
      if (!item) return res.status(400).json({ message: 'Unknown test in this order' });

      if (entry.result !== undefined) item.result = entry.result;
      if (entry.unit !== undefined) item.unit = entry.unit;
      if (entry.referenceRange !== undefined) item.referenceRange = entry.referenceRange;
      if (entry.resultAttachment !== undefined) item.resultAttachment = entry.resultAttachment;
      if (entry.flag) item.flag = entry.flag; // an empty flag is ignored
    }

    order.status = 'processing';
    await order.save();

    res.json({ order });
  } catch (err) {
    serverError(res, err);
  }
};

export const completeOrder = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });

    const order = await findStaffOrder(req, lab);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'processing') {
      return res.status(400).json({ message: 'Save results before completing the order' });
    }
    if (order.items.some((i) => !i.result && !i.resultAttachment?.url)) {
      return res.status(400).json({ message: 'Every test needs a result or an attachment' });
    }

    order.status = 'completed';
    order.completedAt = new Date();
    order.processedBy = req.user._id;
    await order.save();

    res.json({ order });
  } catch (err) {
    serverError(res, err);
  }
};

export const setPayment = async (req, res) => {
  try {
    const lab = await getStaffLab(req);
    if (!lab) return res.status(403).json({ message: 'Only approved lab staff can do this' });

    const order = await findStaffOrder(req, lab);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const { paymentStatus } = req.body;
    if (!['unpaid', 'paid', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.json({ order });
  } catch (err) {
    serverError(res, err);
  }
};




export const searchPatients = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json({ patients: [] });
  const rx = new RegExp(escapeRegex(q), 'i');
  const patients = await User.find({ role: 'patient', $or: [{ fullName: rx }, { email: rx }, { phone: rx }] })
    .select('fullName email phone').limit(10).lean();
  res.json({ patients });
};

export const doctorCreateOrder = async (req, res) => {
  const { labId, patientId, testIds, clinicalNote, urgent } = req.body;
  if (!Array.isArray(testIds) || !testIds.length) return res.status(400).json({ message: 'Choose at least one test' });

  const [lab, patient, tests] = await Promise.all([
    Organization.findById(labId),                                  // also check it is an approved lab
    User.findOne({ _id: patientId, role: 'patient' }),
    LabTest.find({ _id: { $in: testIds }, lab: labId }),           // add your isActive check
  ]);
  if (!lab || !patient) return res.status(404).json({ message: 'Lab or patient not found' });
  if (tests.length !== new Set(testIds.map(String)).size) return res.status(400).json({ message: 'Some tests are not offered by this lab' });

  // prices come from the database, never from the client
  const items = tests.map((t) => ({ test: t._id, testName: t.name, price: t.price, referenceRange: t.referenceRange }));
  const order = await LabOrder.create({
    patient: patient._id, orderedBy: req.user._id, lab: lab._id,
    orderNumber: await nextLabOrderNumber(),                       // reuse your patient flow's generator
    items, totalAmount: items.reduce((s, i) => s + i.price, 0),
    clinicalNote, urgent: !!urgent,
  });
  // notify the lab and the patient here with your existing notification helper
  res.status(201).json({ order });
};

const mine = (req) => ({ _id: req.params.id, orderedBy: req.user._id });
const populateOrder = (q) => q.populate('patient', 'fullName email phone').populate('lab', 'name phone');

export const doctorOrders = async (req, res) => {
  const orders = await populateOrder(LabOrder.find({ orderedBy: req.user._id }).sort('-createdAt')).lean();
  res.json({ orders });
};

export const doctorOrder = async (req, res) => {
  const order = await populateOrder(LabOrder.findOne(mine(req))).lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
};

export const doctorCancelOrder = async (req, res) => {
  const order = await LabOrder.findOne(mine(req));
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.status !== 'ordered' || order.paymentStatus !== 'unpaid') return res.status(400).json({ message: 'This order can no longer be cancelled' });
  order.status = 'cancelled';
  await order.save();
  res.json({ order });
};

const paystack = (path, options = {}) =>
  fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
  }).then((r) => r.json());

export const payLabOrder = async (req, res) => {
  const order = await LabOrder.findOne(mine(req));
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.paymentStatus === 'paid' || order.status === 'cancelled') return res.status(400).json({ message: 'Nothing to pay on this order' });

  const reference = `LAB-${order.orderNumber}-${Date.now()}`;
  const json = await paystack('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: req.user.email,
      amount: Math.round(order.totalAmount * 100),
      reference,
      callback_url: `${process.env.CLIENT_URL.split(',')[0].trim()}/dashboard?tab=lab-orders`,
      metadata: { type: 'lab_order', orderId: String(order._id) },
    }),
  });
  if (!json.status) return res.status(502).json({ message: 'Could not start payment' });
  order.paymentReference = reference;
  await order.save();
  res.json({ authorizationUrl: json.data.authorization_url, reference });
};

// shared by the verify endpoint and the webhook, safe to run twice
export const settleLabPayment = async (order) => {
  if (order.paymentStatus === 'paid') return order;
  const json = await paystack(`/transaction/verify/${order.paymentReference}`);
  if (json.data?.status === 'success' && json.data.amount === Math.round(order.totalAmount * 100)) {
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    await order.save();
  }
  return order;
};

export const verifyLabPayment = async (req, res) => {
  const order = await LabOrder.findOne({ paymentReference: req.params.reference, orderedBy: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  await settleLabPayment(order);
  res.json({ order });
};