import mongoose from 'mongoose';
import LabTest from '../models/LabTest.js';
import LabOrder from '../models/LabOrder.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';

/* ---------- helpers ---------- */
const STAFF = ['lab_tech', 'hospital_admin'];
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pick = (o = {}, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const validId = (id) => mongoose.isValidObjectId(id) || fail(404, 'Not found');
const orderNo = () => `LAB-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
const dupeGuard = (e) => { if (e.code === 11000) fail(409, 'A test with this name already exists'); throw e; };

// The signed-in user must be lab staff attached to an approved lab organization
const staffLab = async (req) => {
  const org = req.user.organization && (await Organization.findById(req.user.organization));
  if (!STAFF.includes(req.user.role) || !org || org.type !== 'lab') fail(403, 'Lab staff only');
  if (org.status !== 'approved') fail(403, 'Your lab has not been approved yet');
  return org;
};

// Patient who owns it, the doctor who ordered it, or staff of the lab
const loadOrderFor = async (req) => {
  validId(req.params.id);
  const o = await LabOrder.findById(req.params.id)
    .populate('lab', 'name address phone logo')
    .populate('patient', 'fullName email phone gender dateOfBirth')
    .populate('orderedBy', 'fullName');
  if (!o) fail(404, 'Order not found');
  const uid = String(req.user._id);
  const ok =
    String(o.patient._id) === uid ||
    (o.orderedBy && String(o.orderedBy._id) === uid) ||
    (STAFF.includes(req.user.role) && String(req.user.organization) === String(o.lab._id));
  if (!ok) fail(403, 'Not allowed');
  return o;
};

const staffOrder = async (req) => {
  const org = await staffLab(req);
  validId(req.params.id);
  const o = await LabOrder.findOne({ _id: req.params.id, lab: org._id });
  if (!o) fail(404, 'Order not found');
  return o;
};

/* ---------- patient-facing: browse labs ---------- */
export const listLabs = wrap(async (req, res) => {
  const { q, state, city } = req.query;
  const filter = { type: 'lab', status: 'approved' };
  if (q) filter.name = new RegExp(esc(q), 'i');
  if (state) filter['address.state'] = new RegExp(`^${esc(state)}$`, 'i');
  if (city) filter['address.city'] = new RegExp(`^${esc(city)}$`, 'i');
  const labs = await Organization.find(filter).select('name address phone logo coordinates').sort('name').limit(60);
  res.json({ labs });
});

export const listLabTests = wrap(async (req, res) => {
  validId(req.params.labId);
  const lab = await Organization.findOne({ _id: req.params.labId, type: 'lab', status: 'approved' }).select('name address phone logo');
  if (!lab) fail(404, 'Lab not found');
  const filter = { lab: lab._id, isActive: true };
  if (req.query.q) filter.name = new RegExp(esc(req.query.q), 'i');
  res.json({ lab, tests: await LabTest.find(filter).sort('category name') });
});

/* ---------- orders: patient / doctor / walk-in ---------- */
export const createOrder = wrap(async (req, res) => {
  const { testIds, labId, patientId } = req.body;
  if (!Array.isArray(testIds) || !testIds.length) fail(400, 'Select at least one test');
  const { role } = req.user;
  let lab = labId;
  let patient = req.user._id;
  let orderedBy;

  if (role === 'doctor' || STAFF.includes(role)) {
    if (!mongoose.isValidObjectId(patientId)) fail(400, 'A valid patientId is required');
    const p = await User.findOne({ _id: patientId, role: 'patient' });
    if (!p) fail(404, 'Patient not found');
    patient = p._id;
    if (role === 'doctor') orderedBy = req.user._id;
    else lab = (await staffLab(req))._id; // walk-in registered by lab staff
  } else if (role !== 'patient') fail(403, 'Not allowed');

  if (!mongoose.isValidObjectId(lab)) fail(400, 'A valid labId is required');
  const labDoc = await Organization.findOne({ _id: lab, type: 'lab', status: 'approved' });
  if (!labDoc) fail(404, 'Lab not found');

  const ids = [...new Set(testIds.map(String))];
  if (!ids.every((i) => mongoose.isValidObjectId(i))) fail(400, 'Invalid test selected');
  const tests = await LabTest.find({ _id: { $in: ids }, lab: labDoc._id, isActive: true });
  if (tests.length !== ids.length) fail(400, 'One or more tests are no longer available');

  const items = tests.map((t) => ({ test: t._id, testName: t.name, price: t.price, referenceRange: t.referenceRange }));
  const order = await LabOrder.create({
    patient, orderedBy, lab: labDoc._id, orderNumber: orderNo(), items,
    totalAmount: items.reduce((s, i) => s + i.price, 0),
  });
  res.status(201).json({ order });
});

export const myOrders = wrap(async (req, res) => {
  const filter = { patient: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const orders = await LabOrder.find(filter).populate('lab', 'name address').sort('-createdAt').limit(100);
  res.json({ orders });
});

export const getOrder = wrap(async (req, res) => res.json({ order: await loadOrderFor(req) }));

export const cancelOrder = wrap(async (req, res) => {
  const order = await loadOrderFor(req);
  const isPatient = String(order.patient._id) === String(req.user._id);
  if (!isPatient && !STAFF.includes(req.user.role)) fail(403, 'Not allowed');
  if (['completed', 'cancelled'].includes(order.status)) fail(400, `Order is already ${order.status}`);
  if (isPatient && order.status !== 'ordered') fail(400, 'The sample has been collected. Please contact the lab to cancel.');
  order.status = 'cancelled';
  if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';
  await order.save();
  res.json({ order });
});

/* ---------- lab staff: catalog ---------- */
const TEST_FIELDS = ['name', 'code', 'category', 'price', 'sampleType', 'turnaroundHours', 'referenceRange', 'isActive'];

export const staffListTests = wrap(async (req, res) => {
  const org = await staffLab(req);
  res.json({ tests: await LabTest.find({ lab: org._id }).sort('category name') });
});

export const staffCreateTest = wrap(async (req, res) => {
  const org = await staffLab(req);
  try {
    res.status(201).json({ test: await LabTest.create({ ...pick(req.body, TEST_FIELDS), lab: org._id }) });
  } catch (e) { dupeGuard(e); }
});

export const staffUpdateTest = wrap(async (req, res) => {
  const org = await staffLab(req);
  validId(req.params.id);
  try {
    const test = await LabTest.findOneAndUpdate({ _id: req.params.id, lab: org._id }, pick(req.body, TEST_FIELDS), { new: true, runValidators: true });
    if (!test) fail(404, 'Test not found');
    res.json({ test });
  } catch (e) { dupeGuard(e); }
});

// Soft delete so old orders keep their reference
export const staffDeleteTest = wrap(async (req, res) => {
  const org = await staffLab(req);
  validId(req.params.id);
  const test = await LabTest.findOneAndUpdate({ _id: req.params.id, lab: org._id }, { isActive: false }, { new: true });
  if (!test) fail(404, 'Test not found');
  res.json({ test });
});

/* ---------- lab staff: order workflow ---------- */
export const staffListOrders = wrap(async (req, res) => {
  const org = await staffLab(req);
  const { status, q } = req.query;
  const filter = { lab: org._id };
  if (status) filter.status = status;
  if (q) filter.orderNumber = new RegExp(esc(q), 'i');
  const [orders, counts] = await Promise.all([
    LabOrder.find(filter).populate('patient', 'fullName phone').sort('-createdAt').limit(100),
    LabOrder.aggregate([{ $match: { lab: org._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  res.json({ orders, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) });
});

export const collectSample = wrap(async (req, res) => {
  const order = await staffOrder(req);
  if (order.status !== 'ordered') fail(400, 'Sample can only be collected for new orders');
  order.status = 'sample_collected';
  order.collectedAt = new Date();
  await order.save();
  res.json({ order });
});

export const saveResults = wrap(async (req, res) => {
  const order = await staffOrder(req);
  if (!['sample_collected', 'processing'].includes(order.status)) fail(400, 'Collect the sample before entering results');
  for (const r of req.body.items || []) {
    const item = order.items.id(r.itemId);
    if (!item) fail(400, 'Unknown test in this order');
    const data = pick(r, ['result', 'unit', 'referenceRange', 'flag', 'resultAttachment']);
    if (!data.flag) delete data.flag; // empty string is not a valid flag
    Object.assign(item, data);
  }
  order.status = 'processing';
  await order.save();
  res.json({ order });
});

export const completeOrder = wrap(async (req, res) => {
  const order = await staffOrder(req);
  if (order.status !== 'processing') fail(400, 'Save results before completing the order');
  if (order.items.some((i) => !i.result && !i.resultAttachment?.url)) fail(400, 'Every test needs a result or an attachment');
  order.status = 'completed';
  order.completedAt = new Date();
  order.processedBy = req.user._id;
  await order.save();
  res.json({ order });
});

export const setPayment = wrap(async (req, res) => {
  const order = await staffOrder(req);
  const { paymentStatus } = req.body;
  if (!['unpaid', 'paid', 'refunded'].includes(paymentStatus)) fail(400, 'Invalid payment status');
  order.paymentStatus = paymentStatus;
  await order.save();
  res.json({ order });
});