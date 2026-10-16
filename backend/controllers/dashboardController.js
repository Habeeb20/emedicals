import mongoose from 'mongoose';
import Appointment, { ACTIVE_STATUS } from '../models/Appointment.js';
import Prescription from '../models/Prescription.js';
import LabOrder from '../models/LabOrder.js';
import LabTest from '../models/LabTest.js';
import Organization from '../models/Organization.js';
import User, { Review, Interaction, TIERS } from '../models/User.js';
import { PharmacyOrder } from '../models/PharmacyOrder.js';
import { Drug, Batch, Sale } from '../models/Pharmacy.js';
import { HttpError, handle } from '../utils/engagement.js';
import {  AgentSignup, LoyaltyTransaction } from '../models/User.js';

/**
 * GET /dashboard/overview
 * Returns { role, headline, widgets[] }. Every role gets its own list of widgets;
 * the frontend just renders whatever comes back, so adding a widget never needs a UI change.
 *
 * Widget types: kpi | area | bar | donut | gauge | list | notice
 */

/* ============================== HELPERS ============================== */

const TZ = 'Africa/Lagos';
const DAY = 864e5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const ymd = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const todayStr = () => ymd(Date.now());
const startOfToday = () => new Date(`${todayStr()}T00:00:00+01:00`); // Lagos is UTC+1, no DST
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const daysAhead = (n) => new Date(Date.now() + n * DAY);
const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;
const pretty = (s) => String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const pl = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const sum = (rows, ...keys) => rows.filter((r) => !keys.length || keys.includes(r._id)).reduce((s, r) => s + r.n, 0);

const TONE = {
  confirmed: 'green', completed: 'green', paid: 'green', ready: 'green', approved: 'green',
  pending: 'amber', awaiting_payment: 'amber', ordered: 'amber', sample_collected: 'blue', processing: 'blue',
  preparing: 'blue', in_progress: 'blue', out_for_delivery: 'blue', issued: 'blue', partially_dispensed: 'amber',
  cancelled: 'red', rejected: 'red', no_show: 'red', refunded: 'red', suspended: 'red',
};
const badge = (status) => ({ text: pretty(status), tone: TONE[status] || 'gray' });

// Zero-filled day or month buckets: [{ label, key }]
function lastKeys(unit, count) {
  if (unit === 'day') {
    return Array.from({ length: count }, (_, i) => {
      const key = ymd(Date.now() - (count - 1 - i) * DAY);
      const [, m, d] = key.split('-');
      return { key, label: `${Number(d)} ${MONTHS[Number(m) - 1]}` };
    });
  }
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1));
    return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: MONTHS[d.getUTCMonth()] };
  });
}

/** Time series: counts/sums per day (30) or month (6). `acc` = { name: <$group accumulator> } */
async function series(Model, match, acc, { field = 'createdAt', unit = 'day', count = unit === 'day' ? 30 : 6 } = {}) {
  const keys = lastKeys(unit, count);
  const now = new Date();
  const from = unit === 'day' ? daysAgo(count) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1), 1));
  const rows = await Model.aggregate([
    { $match: { ...match, [field]: { $gte: from } } },
    { $group: { _id: { $dateToString: { format: unit === 'day' ? '%Y-%m-%d' : '%Y-%m', date: `$${field}`, timezone: TZ } }, ...acc } },
  ]);
  const by = new Map(rows.map((r) => [r._id, r]));
  return keys.map(({ key, label }) => ({
    label,
    ...Object.fromEntries(Object.keys(acc).map((name) => [name, r2(by.get(key)?.[name])])),
  }));
}
const zip = (...arrs) => arrs[0].map((row, i) => Object.assign({}, ...arrs.map((a) => a[i])));

/** Last 30 days vs the 30 before: { cur, prev, pct } */
async function trend(Model, match, { field = 'createdAt', total = null } = {}) {
  const cut = daysAgo(30);
  const rows = await Model.aggregate([
    { $match: { ...match, [field]: { $gte: daysAgo(60) } } },
    { $group: { _id: { $cond: [{ $gte: [`$${field}`, cut] }, 'cur', 'prev'] }, v: { $sum: total || 1 } } },
  ]);
  const v = Object.fromEntries(rows.map((r) => [r._id, r.v]));
  const cur = r2(v.cur);
  const prev = r2(v.prev);
  return { cur, prev, pct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : null };
}

const groupCount = (Model, match, key, pre = []) =>
  Model.aggregate([{ $match: match }, ...pre, { $group: { _id: key, n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
const slices = (rows) => rows.filter((r) => r._id != null && r._id !== '').map((r) => ({ label: pretty(r._id), value: r.n }));

/* ---- widget constructors ---- */
const kpi = (id, label, value, o = {}) => ({ type: 'kpi', id, label, value, format: 'number', ...o });
const withTrend = (t) => ({ delta: t.pct, deltaLabel: 'vs previous 30 days' });
const area = (id, title, data, defs, o = {}) => ({ type: 'area', id, title, data, series: defs, span: 8, ...o });
const bars = (id, title, data, defs, o = {}) => ({ type: 'bar', id, title, data, series: defs, span: 6, ...o });
const donut = (id, title, data, o = {}) => ({ type: 'donut', id, title, data, span: 4, ...o });
const gauge = (id, title, value, max, o = {}) => ({ type: 'gauge', id, title, value, max, span: 4, ...o });
const list = (id, title, items, o = {}) => ({ type: 'list', id, title, items, span: 6, empty: 'Nothing to show yet', ...o });
const notice = (text) => ({ type: 'notice', id: 'notice', text, span: 12 });

/* ---- shared blocks: profile engagement + reviews (people and organizations) ---- */
async function engagementWidgets(targetType, targetId) {
  const match = { targetType, target: oid(targetId) };
  const [daily, channels] = await Promise.all([
    series(Interaction, match, {
      views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
      likes: { $sum: { $cond: [{ $eq: ['$type', 'like'] }, 1, 0] } },
      shares: { $sum: { $cond: [{ $eq: ['$type', 'share'] }, 1, 0] } },
    }),
    groupCount(Interaction, { ...match, type: 'share' }, '$channel'),
  ]);
  return [
    area('engagement', 'Profile engagement', daily,
      [{ key: 'views', label: 'Views' }, { key: 'likes', label: 'Likes' }, { key: 'shares', label: 'Shares' }],
      { subtitle: 'Last 30 days' }),
    donut('share-channels', 'How people share you', slices(channels), { empty: 'No shares yet' }),
  ];
}

async function reviewWidgets(targetType, targetId, doc) {
  const target = oid(targetId);
  const [dist, recent] = await Promise.all([
    Review.aggregate([{ $match: { targetType, target, isHidden: false } }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
    Review.find({ targetType, target, isHidden: false }).sort('-createdAt').limit(4).populate('reviewer', 'fullName').lean(),
  ]);
  const by = new Map(dist.map((d) => [d._id, d.n]));
  return [
    gauge('reputation', 'Reputation', doc?.ratingAverage || 0, 5, { sub: pl(doc?.ratingCount || 0, 'review'), display: 'rating' }),
    bars('ratings', 'Rating breakdown', [5, 4, 3, 2, 1].map((s) => ({ label: `${s} ★`, value: by.get(s) || 0 })),
      [{ key: 'value', label: 'Reviews' }], { horizontal: true, span: 4 }),
    list('reviews', 'Latest reviews', recent.map((r) => ({
      title: r.reviewer?.fullName || 'Anonymous', subtitle: r.comment || r.title || 'No comment', meta: '★'.repeat(r.rating),
    })), { span: 4, empty: 'No reviews yet' }),
  ];
}

/* ================================ PATIENT ============================ */

async function patientOverview(u) {
  const me = oid(u._id);
  const today = todayStr();
  const m = { unit: 'month' };
  const [
    appt, rx, lab, shop, upcoming,
    aAppt, aLab, aShop, sCons, sLab, sShop,
    flags, next, orders, labs, rxs,
  ] = await Promise.all([
    groupCount(Appointment, { patient: me }, '$status'),
    groupCount(Prescription, { patient: me }, '$status'),
    groupCount(LabOrder, { patient: me }, '$status'),
    groupCount(PharmacyOrder, { customer: me }, '$status'),
    Appointment.countDocuments({ patient: me, status: { $in: ACTIVE_STATUS }, date: { $gte: today } }),
    series(Appointment, { patient: me }, { appointments: { $sum: 1 } }, m),
    series(LabOrder, { patient: me }, { labTests: { $sum: 1 } }, m),
    series(PharmacyOrder, { customer: me, status: { $nin: ['awaiting_payment', 'cancelled'] } }, { orders: { $sum: 1 } }, m),
    series(Appointment, { patient: me }, { consultations: { $sum: '$payment.amountPaid' } }, m),
    series(LabOrder, { patient: me, paymentStatus: 'paid' }, { labTests: { $sum: '$totalAmount' } }, m),
    series(PharmacyOrder, { customer: me, paymentStatus: 'paid' }, { pharmacy: { $sum: '$total' } }, m),
    LabOrder.aggregate([
      { $match: { patient: me, status: 'completed' } }, { $unwind: '$items' },
      { $group: { _id: '$items.flag', n: { $sum: 1 } } },
    ]),
    Appointment.find({ patient: me, status: { $in: ACTIVE_STATUS }, date: { $gte: today } }).sort('date queueNumber').limit(5)
      .populate('doctor', 'fullName').populate('organization', 'name').lean(),
    PharmacyOrder.find({ customer: me, status: { $in: ['awaiting_payment', 'confirmed', 'preparing', 'ready', 'out_for_delivery'] } })
      .sort('-createdAt').limit(5).populate('pharmacy', 'name').lean(),
    LabOrder.find({ patient: me }).sort('-createdAt').limit(5).populate('lab', 'name').lean(),
    Prescription.find({ patient: me }).sort('-createdAt').limit(5).populate('doctor', 'fullName').lean(),
  ]);

  const spend = zip(sCons, sLab, sShop);
  const spent = spend.reduce((s, r) => s + r.consultations + r.labTests + r.pharmacy, 0);
  const activeOrders = sum(shop, 'confirmed', 'preparing', 'ready', 'out_for_delivery');

  const life = u.loyalty?.lifetimePoints || 0;
  const tierNow = [...TIERS].reverse().find((t) => life >= t.min);
  const tierNext = TIERS.find((t) => t.min > life);
  const loyalty = tierNext
    ? gauge('loyalty', 'Loyalty tier', life - tierNow.min, tierNext.min - tierNow.min,
        { sub: `${tierNext.min - life} pts to ${pretty(tierNext.name)}`, label: pretty(tierNow.name), span: 3 })
    : gauge('loyalty', 'Loyalty tier', 1, 1, { sub: 'Top tier reached', label: pretty(tierNow.name), span: 3 });

  return {
    headline: `${pl(upcoming, 'upcoming appointment')} and ${pl(activeOrders, 'active pharmacy order')}.`,
    widgets: [
      kpi('upcoming', 'Upcoming appointments', upcoming, { icon: 'calendar', tab: 'appointments', hint: `${sum(appt)} in total` }),
      kpi('rx', 'Active prescriptions', sum(rx, 'issued', 'partially_dispensed'), { icon: 'pill', tab: 'prescriptions', hint: `${sum(rx)} in total` }),
      kpi('labs', 'Lab tests in progress', sum(lab, 'ordered', 'sample_collected', 'processing'), { icon: 'flask', tab: 'lab-orders', hint: `${sum(lab, 'completed')} results ready` }),
      kpi('shop', 'Active pharmacy orders', activeOrders, { icon: 'bag', to: '/shop/orders', hint: `${sum(shop, 'completed')} delivered or collected` }),
      kpi('spent', 'Spent (6 months)', spent, { icon: 'wallet', format: 'currency', hint: 'Consultations, labs, pharmacy' }),
      kpi('points', 'Loyalty points', u.loyalty?.points || 0, { icon: 'gift', hint: `${pretty(tierNow.name)} tier` }),

      area('activity', 'Your health activity', zip(aAppt, aLab, aShop),
        [{ key: 'appointments', label: 'Appointments' }, { key: 'labTests', label: 'Lab tests' }, { key: 'orders', label: 'Pharmacy orders' }],
        { subtitle: 'Last 6 months' }),
      donut('appt-status', 'Appointments by status', slices(appt), { empty: 'No appointments yet' }),
      bars('spend', 'Where your money goes', spend,
        [{ key: 'consultations', label: 'Consultations' }, { key: 'labTests', label: 'Lab tests' }, { key: 'pharmacy', label: 'Pharmacy' }],
        { stacked: true, format: 'currency', subtitle: 'Last 6 months', span: 6 }),
      donut('lab-flags', 'Your lab results', slices(flags), { span: 3, empty: 'No results yet' }),
      loyalty,

      list('next-appts', 'Upcoming appointments', next.map((a) => ({
        title: a.doctor?.fullName ? `Dr ${a.doctor.fullName}` : a.organization?.name || 'Appointment',
        subtitle: [a.date, a.time, a.department].filter(Boolean).join(' · '),
        meta: a.queueNumber ? `#${a.queueNumber}` : '', badge: badge(a.status), tab: 'appointments',
      })), { empty: 'No upcoming appointments' }),
      list('shop-orders', 'Pharmacy orders in progress', orders.map((o) => ({
        title: o.orderNo, subtitle: `${o.pharmacy?.name || 'Pharmacy'} · ${o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}`,
        meta: naira(o.total), badge: badge(o.status), to: `/shop/orders/${o._id}`,
      })), { empty: 'No orders in progress' }),
      list('recent-labs', 'Recent lab orders', labs.map((l) => ({
        title: l.orderNumber || 'Lab order', subtitle: `${l.lab?.name || 'Laboratory'} · ${pl(l.items?.length || 0, 'test')}`,
        meta: naira(l.totalAmount), badge: badge(l.status), tab: 'lab-orders',
      })), { empty: 'No lab orders yet' }),
      list('recent-rx', 'Recent prescriptions', rxs.map((p) => ({
        title: p.code || 'Prescription', subtitle: `${p.doctor?.fullName ? `Dr ${p.doctor.fullName} · ` : ''}${pl(p.items?.length || 0, 'medicine')}`,
        meta: ymd(p.createdAt), badge: badge(p.status), tab: 'prescriptions',
      })), { empty: 'No prescriptions yet' }),
    ],
  };
}

/* ======================= DOCTOR / NURSE / HOSPITAL ADMIN ======================= */

async function clinicalOverview(u) {
  const isDoctor = u.role === 'doctor';
  const isAdmin = u.role === 'hospital_admin';
  const isNurse = u.role === 'nurse';
  const orgId = u.organization ? oid(u.organization) : null;
  const scope = isDoctor ? { doctor: oid(u._id) } : { organization: orgId };
  const today = todayStr();

  const [
    org, todayCount, pending, inProgress, completed, revenue, patients, daily, status, weekday, outcomes, meds,
    money, depts, staff, queue, requests,
  ] = await Promise.all([
    isAdmin ? Organization.findById(orgId).select('ratingAverage ratingCount').lean() : null,
    Appointment.countDocuments({ ...scope, date: today, status: { $nin: ['rejected', 'cancelled'] } }),
    Appointment.countDocuments({ ...scope, status: 'pending' }),
    Appointment.countDocuments({ ...scope, status: 'in_progress' }),
    trend(Appointment, { ...scope, status: 'completed' }),
    isNurse ? null : trend(Appointment, scope, { total: '$payment.amountPaid' }),
    Appointment.distinct('patient', { ...scope, createdAt: { $gte: daysAgo(90) } }),
    series(Appointment, scope, { booked: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } }),
    groupCount(Appointment, scope, '$status'),
    groupCount(Appointment, scope, {
      $dayOfWeek: { date: { $dateFromString: { dateString: '$date', onError: null, onNull: null } } },
    }),
    groupCount(Appointment, { ...scope, status: 'completed', 'outcome.condition': { $exists: true, $ne: '' } }, '$outcome.condition'),
    Prescription.aggregate([
      { $match: isDoctor ? { doctor: oid(u._id) } : { organization: orgId } }, { $unwind: '$items' },
      { $group: { _id: { $toLower: '$items.medicine' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 6 },
    ]),
    isNurse ? null : series(Appointment, scope, { revenue: { $sum: '$payment.amountPaid' } }, { unit: 'month' }),
    isDoctor ? [] : groupCount(Appointment, scope, '$department'),
    isAdmin ? groupCount(User, { organization: orgId }, '$role') : [],
    Appointment.find({ ...scope, date: today, status: { $in: ['pending', 'confirmed', 'in_progress'] } })
      .sort('queueNumber').limit(6).populate('patient', 'fullName').lean(),
    Appointment.find({ ...scope, status: 'pending' }).sort('createdAt').limit(5).populate('patient', 'fullName').lean(),
  ]);

  const rep = isAdmin ? { type: 'Organization', id: orgId, doc: org } : { type: 'User', id: u._id, doc: u };
  const wk = new Map(weekday.map((r) => [r._id, r.n]));
  const row = (a) => ({
    title: a.patient?.fullName || 'Patient',
    subtitle: [a.queueNumber ? `#${a.queueNumber}` : null, a.time || a.date, a.department].filter(Boolean).join(' · '),
    meta: a.reason ? String(a.reason).slice(0, 28) : '', badge: badge(a.status), tab: 'appointments',
  });

  const widgets = [
    kpi('today', "Today's appointments", todayCount, { icon: 'calendar', tab: 'appointments', hint: pl(queue.length, 'in the queue') }),
    kpi('pending', 'Awaiting decision', pending, { icon: 'clock', tab: 'appointments', tone: pending ? 'amber' : undefined, hint: 'Pending requests' }),
    kpi('completed', 'Completed (30 days)', completed.cur, { icon: 'check', ...withTrend(completed), spark: daily.slice(-14).map((d) => d.completed) }),
    kpi('patients', 'Patients (90 days)', patients.length, { icon: 'users', hint: 'Unique patients' }),
    revenue
      ? kpi('revenue', 'Revenue (30 days)', revenue.cur, { icon: 'wallet', format: 'currency', ...withTrend(revenue) })
      : kpi('inprogress', 'In consultation', inProgress, { icon: 'activity', hint: 'Right now' }),
    kpi('rating', 'Rating', rep.doc?.ratingAverage || 0, { icon: 'star', format: 'rating', hint: pl(rep.doc?.ratingCount || 0, 'review') }),

    area('appt-daily', 'Appointments', daily,
      [{ key: 'booked', label: 'Booked' }, { key: 'completed', label: 'Completed' }], { subtitle: 'Last 30 days' }),
    donut('appt-status', 'Status breakdown', slices(status)),
    bars('weekday', 'Busiest days', WEEKDAYS.map((label, i) => ({ label, value: wk.get(i + 1) || 0 })), [{ key: 'value', label: 'Appointments' }], { span: 4 }),
    donut('outcomes', 'Patient outcomes', slices(outcomes), { empty: 'No outcomes recorded yet' }),
    bars('meds', 'Most prescribed medicines', meds.map((r) => ({ label: pretty(r._id), value: r.n })), [{ key: 'value', label: 'Prescriptions' }],
      { horizontal: true, span: 4 }),
  ];
  if (money) widgets.push(bars('revenue-monthly', 'Revenue', money, [{ key: 'revenue', label: 'Revenue' }], { format: 'currency', subtitle: 'Last 6 months', span: isAdmin ? 8 : 12 }));
  if (isAdmin) widgets.push(donut('staff', 'Staff by role', slices(staff), { span: 4 }));
  if (!isDoctor) widgets.push(bars('depts', 'Appointments by department', depts.filter((d) => d._id).slice(0, 8).map((d) => ({ label: d._id, value: d.n })),
    [{ key: 'value', label: 'Appointments' }], { horizontal: true, span: 12 }));
  widgets.push(
    list('queue', "Today's queue", queue.map(row), { empty: 'No one in the queue today' }),
    list('requests', 'Waiting for your decision', requests.map(row), { empty: 'No pending requests' }),
    ...(await reviewWidgets(rep.type, rep.id, rep.doc)),
    ...(await engagementWidgets(rep.type, rep.id)),
  );

  return { headline: `${pl(todayCount, 'appointment')} today, ${pending} awaiting a decision.`, widgets };
}

/* ================================= LAB ================================ */

async function labOverview(u) {
  const lab = oid(u.organization);
  const scope = { lab };
  const [
    org, today, awaiting, processing, completed, revenue, turnaround, tests, daily, status, top, flags, money, categories,
    queue, critical,
  ] = await Promise.all([
    Organization.findById(lab).select('ratingAverage ratingCount').lean(),
    LabOrder.countDocuments({ ...scope, createdAt: { $gte: startOfToday() } }),
    LabOrder.countDocuments({ ...scope, status: 'ordered' }),
    LabOrder.countDocuments({ ...scope, status: { $in: ['sample_collected', 'processing'] } }),
    trend(LabOrder, { ...scope, status: 'completed' }),
    trend(LabOrder, { ...scope, paymentStatus: 'paid' }, { total: '$totalAmount' }),
    LabOrder.aggregate([
      { $match: { ...scope, status: 'completed', completedAt: { $gte: daysAgo(30) } } },
      { $group: { _id: null, hrs: { $avg: { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 3600000] } } } },
    ]),
    LabTest.countDocuments({ lab, isActive: true }),
    series(LabOrder, scope, { orders: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } }),
    groupCount(LabOrder, scope, '$status'),
    LabOrder.aggregate([
      { $match: { ...scope, createdAt: { $gte: daysAgo(90) } } }, { $unwind: '$items' },
      { $group: { _id: '$items.testName', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 },
    ]),
    LabOrder.aggregate([
      { $match: { ...scope, status: 'completed', completedAt: { $gte: daysAgo(90) } } }, { $unwind: '$items' },
      { $group: { _id: '$items.flag', n: { $sum: 1 } } },
    ]),
    series(LabOrder, { ...scope, paymentStatus: 'paid' }, { revenue: { $sum: '$totalAmount' } }, { unit: 'month' }),
    LabOrder.aggregate([
      { $match: { ...scope, createdAt: { $gte: daysAgo(90) } } }, { $unwind: '$items' },
      { $lookup: { from: LabTest.collection.name, localField: 'items.test', foreignField: '_id', as: 't' } }, { $unwind: '$t' },
      { $group: { _id: '$t.category', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 7 },
    ]),
    LabOrder.find({ ...scope, status: { $in: ['ordered', 'sample_collected', 'processing'] } })
      .sort('createdAt').limit(6).populate('patient', 'fullName').lean(),
    LabOrder.find({ ...scope, status: 'completed', 'items.flag': 'critical' })
      .sort('-completedAt').limit(4).populate('patient', 'fullName').lean(),
  ]);

  const queued = awaiting + processing;
  return {
    headline: `${pl(queued, 'order')} in your queue, ${awaiting} waiting for a sample.`,
    widgets: [
      kpi('today', 'Orders today', today, { icon: 'flask', tab: 'lab-orders', hint: `${pl(tests, 'test')} in catalog` }),
      kpi('awaiting', 'Awaiting sample', awaiting, { icon: 'clock', tab: 'lab-orders', tone: awaiting ? 'amber' : undefined, hint: 'Collect samples' }),
      kpi('processing', 'In processing', processing, { icon: 'activity', tab: 'lab-orders', hint: 'Samples being analysed' }),
      kpi('completed', 'Completed (30 days)', completed.cur, { icon: 'check', ...withTrend(completed), spark: daily.slice(-14).map((d) => d.completed) }),
      kpi('revenue', 'Revenue (30 days)', revenue.cur, { icon: 'wallet', format: 'currency', ...withTrend(revenue) }),
      kpi('tat', 'Avg turnaround', r2(turnaround[0]?.hrs), { icon: 'clock', format: 'hours', hint: 'Order to result' }),

      area('orders-daily', 'Lab orders', daily, [{ key: 'orders', label: 'Received' }, { key: 'completed', label: 'Completed' }], { subtitle: 'Last 30 days' }),
      donut('status', 'Orders by status', slices(status)),
      bars('top-tests', 'Most requested tests', top.map((r) => ({ label: r._id || 'Test', value: r.n })), [{ key: 'value', label: 'Orders' }],
        { horizontal: true, subtitle: 'Last 90 days', span: 6 }),
      donut('categories', 'Test categories', slices(categories), { span: 3, empty: 'No data yet' }),
      donut('flags', 'Result flags', slices(flags), { span: 3, empty: 'No results yet' }),
      bars('revenue-monthly', 'Revenue', money, [{ key: 'revenue', label: 'Revenue' }], { format: 'currency', subtitle: 'Last 6 months', span: 6 }),

      list('queue', 'Work queue', queue.map((o) => ({
        title: o.orderNumber || 'Lab order', subtitle: `${o.patient?.fullName || 'Patient'} · ${pl(o.items?.length || 0, 'test')}`,
        meta: ymd(o.createdAt), badge: badge(o.status), tab: 'lab-orders',
      })), { empty: 'The queue is clear' }),
      list('critical', 'Recent critical results', critical.map((o) => ({
        title: o.orderNumber || 'Lab order', subtitle: o.patient?.fullName || 'Patient',
        meta: o.completedAt ? ymd(o.completedAt) : '', badge: { text: 'Critical', tone: 'red' }, tab: 'lab-orders',
      })), { empty: 'No critical results', span: 12 }),
      ...(await reviewWidgets('Organization', lab, org)),
      ...(await engagementWidgets('Organization', lab)),
    ],
  };
}

/* ============================== PHARMACIST ============================ */

async function pharmacyOverview(u) {
  const ph = oid(u.organization);
  const base = { pharmacy: ph, status: { $ne: 'refunded' } };
  const last30 = { ...base, createdAt: { $gte: daysAgo(30) } };
  const [
    org, todayAgg, trend30, active, low, expiring, value, daily, byType, byMethod, top, byHour, online,
    toAct, lowList, expList,
  ] = await Promise.all([
    Organization.findById(ph).select('ratingAverage ratingCount').lean(),
    Sale.aggregate([{ $match: { ...base, createdAt: { $gte: startOfToday() } } }, { $group: { _id: null, total: { $sum: '$total' }, n: { $sum: 1 } } }]),
    trend(Sale, base, { total: '$total' }),
    PharmacyOrder.countDocuments({ pharmacy: ph, status: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] } }),
    Drug.countDocuments({ pharmacy: ph, isActive: true, $expr: { $lte: ['$stock', '$reorderLevel'] } }),
    Batch.countDocuments({ pharmacy: ph, quantity: { $gt: 0 }, expiryDate: { $lte: daysAhead(90) } }),
    Drug.aggregate([
      { $match: { pharmacy: ph, isActive: true } },
      { $group: { _id: null, cost: { $sum: { $multiply: ['$stock', '$costPrice'] } }, retail: { $sum: { $multiply: ['$stock', '$sellingPrice'] } } } },
    ]),
    series(Sale, base, { sales: { $sum: '$total' }, transactions: { $sum: 1 } }),
    groupCount(Sale, last30, '$type'),
    groupCount(Sale, last30, '$paymentMethod'),
    Sale.aggregate([
      { $match: last30 }, { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' } } }, { $sort: { qty: -1 } }, { $limit: 8 },
    ]),
    groupCount(Sale, last30, { $hour: { date: '$createdAt', timezone: TZ } }),
    groupCount(PharmacyOrder, { pharmacy: ph, status: { $ne: 'awaiting_payment' }, createdAt: { $gte: daysAgo(30) } }, '$status'),
    PharmacyOrder.find({ pharmacy: ph, status: { $in: ['confirmed', 'preparing', 'ready', 'out_for_delivery'] } })
      .sort('createdAt').limit(5).populate('customer', 'fullName').lean(),
    Drug.find({ pharmacy: ph, isActive: true, $expr: { $lte: ['$stock', '$reorderLevel'] } })
      .sort('stock').limit(5).select('genericName brandName strength stock reorderLevel').lean(),
    Batch.find({ pharmacy: ph, quantity: { $gt: 0 }, expiryDate: { $lte: daysAhead(90) } })
      .sort('expiryDate').limit(5).populate('drug', 'genericName strength').lean(),
  ]);

  const t = todayAgg[0] || {};
  const hours = new Map(byHour.map((r) => [r._id, r.n]));
  const inv = value[0] || {};
  const now = Date.now();

  return {
    headline: `${pl(active, 'online order')} to handle and ${pl(low, 'item')} low on stock.`,
    widgets: [
      kpi('sales-today', 'Sales today', r2(t.total), { icon: 'wallet', format: 'currency', tab: 'pharmacy-sales', hint: pl(t.n || 0, 'transaction') }),
      kpi('sales-30', 'Sales (30 days)', trend30.cur, { icon: 'trend', format: 'currency', ...withTrend(trend30), spark: daily.slice(-14).map((d) => d.sales) }),
      kpi('online', 'Online orders to handle', active, { icon: 'bag', to: '/pharmacy/orders', tone: active ? 'amber' : undefined, hint: 'Confirmed to out for delivery' }),
      kpi('low', 'Low stock items', low, { icon: 'alert', tab: 'pharmacy-inventory', tone: low ? 'red' : undefined, hint: 'At or below reorder level' }),
      kpi('expiring', 'Expiring in 90 days', expiring, { icon: 'box', tab: 'pharmacy-inventory', tone: expiring ? 'amber' : undefined, hint: 'Batches with stock left' }),
      kpi('inventory', 'Inventory value', r2(inv.cost), { icon: 'box', format: 'currency', hint: `Retail value ${naira(inv.retail)}` }),

      area('sales-daily', 'Sales', daily, [{ key: 'sales', label: 'Sales (₦)' }], { subtitle: 'Last 30 days', format: 'currency' }),
      donut('by-type', 'Sales by channel', slices(byType), { empty: 'No sales yet' }),
      bars('top-drugs', 'Best-selling drugs', top.map((r) => ({ label: r._id || 'Drug', value: r.qty })), [{ key: 'value', label: 'Units sold' }],
        { horizontal: true, subtitle: 'Last 30 days', span: 6 }),
      bars('by-hour', 'Busiest hours', Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, value: hours.get(h) || 0 })),
        [{ key: 'value', label: 'Sales' }], { span: 6 }),
      donut('by-method', 'Payment methods', slices(byMethod), { span: 6, empty: 'No sales yet' }),
      donut('online-status', 'Online orders', slices(online), { span: 6, empty: 'No online orders yet' }),

      list('to-act', 'Online orders waiting for you', toAct.map((o) => ({
        title: o.orderNo, subtitle: `${o.customer?.fullName || 'Customer'} · ${o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}`,
        meta: naira(o.total), badge: badge(o.status), to: '/pharmacy/orders',
      })), { empty: 'No online orders waiting' }),
      list('low-list', 'Running low', lowList.map((d) => ({
        title: [d.genericName, d.brandName && `(${d.brandName})`, d.strength].filter(Boolean).join(' '),
        subtitle: `Reorder at ${d.reorderLevel}`, meta: `${d.stock} left`, badge: d.stock === 0 ? { text: 'Out', tone: 'red' } : { text: 'Low', tone: 'amber' },
        tab: 'pharmacy-inventory',
      })), { empty: 'Stock levels look healthy' }),
      list('exp-list', 'Expiring soon', expList.map((b) => ({
        title: [b.drug?.genericName, b.drug?.strength].filter(Boolean).join(' ') || 'Drug', subtitle: `Batch ${b.batchNo} · ${b.quantity} units`,
        meta: ymd(b.expiryDate), badge: b.expiryDate.getTime() < now ? { text: 'Expired', tone: 'red' } : { text: 'Soon', tone: 'amber' },
        tab: 'pharmacy-inventory',
      })), { empty: 'Nothing is close to expiry', span: 12 }),
      ...(await reviewWidgets('Organization', ph, org)),
      ...(await engagementWidgets('Organization', ph)),
    ],
  };
}

/* ======================= MORTUARY / CEMETERY OFFICER ================== */
// Booking and record models for these modules weren't part of the schemas provided. Once they exist,
// add their widgets here the same way the lab ones above are built.

async function memorialOverview(u) {
  const orgId = oid(u.organization);
  const org = await Organization.findById(orgId)
    .select('name memorial ratingAverage ratingCount likesCount sharesCount viewsCount').lean();
  const mem = org?.memorial || {};
  return {
    headline: `${org?.name || 'Your organization'}: ${pl(org?.viewsCount || 0, 'profile view')} so far.`,
    widgets: [
      kpi('views', 'Profile views', org?.viewsCount || 0, { icon: 'eye' }),
      kpi('likes', 'Likes', org?.likesCount || 0, { icon: 'heart' }),
      kpi('shares', 'Shares', org?.sharesCount || 0, { icon: 'share' }),
      kpi('rating', 'Rating', org?.ratingAverage || 0, { icon: 'star', format: 'rating', hint: pl(org?.ratingCount || 0, 'review') }),
      kpi('capacity', 'Capacity', mem.capacity || 0, { icon: 'building', hint: mem.bookingsOpen === false ? 'Bookings closed' : 'Bookings open' }),
      kpi('rate', 'Storage rate / day', mem.storageRatePerDay || 0, { icon: 'wallet', format: 'currency' }),
      ...(await engagementWidgets('Organization', orgId)),
      ...(await reviewWidgets('Organization', orgId, org)),
      list('services', 'Services offered', (mem.services || []).map((s) => ({ title: s.name, subtitle: s.description || '', meta: naira(s.price) })),
        { span: 12, empty: 'Add your services in settings to show them here' }),
    ],
  };
}


/* ================================ AGENT =============================== */

const POINT_SOURCES = {  
  AGENT_SIGNUP: 'Registering accounts',
  REFERRAL: 'Referral link',
  EMAIL_VERIFIED: 'Verified email',
  PROFILE_COMPLETED: 'Completed profile',
  APPOINTMENT_COMPLETED: 'Appointments',
  REVIEW_VERIFIED: 'Verified reviews',
  REVIEW: 'Reviews',
  LIKE: 'Likes',
  SHARE: 'Shares',
};

async function agentOverview(u) {
  const me = oid(u._id);
  const scope = { agent: me };

  // Periods use the same Lagos-day logic as every other role
  const cuts = [['today', startOfToday()], ['3d', daysAgo(3)], ['7d', daysAgo(7)], ['30d', daysAgo(30)], ['all', new Date(0)]];
  const periodGroup = { _id: null };
  for (const [k, d] of cuts) {
    const inRange = { $gte: ['$createdAt', d] };
    periodGroup[`${k}_u`] = { $sum: { $cond: [{ $and: [inRange, { $eq: ['$kind', 'user'] }] }, 1, 0] } };
    periodGroup[`${k}_o`] = { $sum: { $cond: [{ $and: [inRange, { $eq: ['$kind', 'organization'] }] }, 1, 0] } };
    periodGroup[`${k}_p`] = { $sum: { $cond: [inRange, '$pointsAwarded', 0] } };
  }

  const [
    periodRows, growth, daily, byRole, byStatus, byOrgType, ledger, pointsDaily,
    referred, recent, recentPoints,
  ] = await Promise.all([
    AgentSignup.aggregate([{ $match: scope }, { $group: periodGroup }]),
    trend(AgentSignup, scope),
    series(AgentSignup, scope, {
      users: { $sum: { $cond: [{ $eq: ['$kind', 'user'] }, 1, 0] } },
      organizations: { $sum: { $cond: [{ $eq: ['$kind', 'organization'] }, 1, 0] } },
    }),
    groupCount(AgentSignup, scope, '$role'),
    AgentSignup.aggregate([
      { $match: scope },
      { $lookup: { from: User.collection.name, localField: 'user', foreignField: '_id', as: 'u' } },
      { $unwind: '$u' },
      {
        $group: {
          _id: { $cond: [{ $not: ['$u.isApproved'] }, 'awaiting_approval', { $cond: ['$u.isVerified', 'active', 'not_verified'] }] },
          n: { $sum: 1 },
        },
      },
    ]),
    AgentSignup.aggregate([
      { $match: { ...scope, kind: 'organization' } },
      { $lookup: { from: Organization.collection.name, localField: 'organization', foreignField: '_id', as: 'o' } },
      { $unwind: '$o' },
      { $group: { _id: '$o.type', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    LoyaltyTransaction.aggregate([
      { $match: { user: me } },
      { $group: { _id: '$action', points: { $sum: '$points' } } },
    ]),
    series(LoyaltyTransaction, { user: me, points: { $gt: 0 } }, { points: { $sum: '$points' } }),
    User.countDocuments({ referredBy: me }),
    AgentSignup.find(scope).sort('-createdAt').limit(6)
      .populate('user', 'fullName email isApproved isVerified')
      .populate('organization', 'name type status').lean(),
    LoyaltyTransaction.find({ user: me }).sort('-createdAt').limit(6).lean(),
  ]);

  // ---- periods ----
  const p = periodRows[0] || {};
  const period = (k) => {
    const users = p[`${k}_u`] || 0;
    const orgs = p[`${k}_o`] || 0;
    return { users, orgs, total: users + orgs, points: p[`${k}_p`] || 0 };
  };
  const today = period('today');
  const all = period('all');
  const split = (x) => `${pl(x.users, 'user')} · ${pl(x.orgs, 'org')}`;
  const PERIOD_LABELS = { today: 'Today', '3d': 'Last 3 days', '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All time' };

  // ---- loyalty ----
  const life = u.loyalty?.lifetimePoints || 0;
  const tierNow = [...TIERS].reverse().find((t) => life >= t.min);
  const tierNext = TIERS.find((t) => t.min > life);
  const tierGauge = tierNext
    ? gauge('tier', 'Loyalty tier', life - tierNow.min, tierNext.min - tierNow.min,
        { sub: `${tierNext.min - life} pts to ${pretty(tierNext.name)}`, label: pretty(tierNow.name) })
    : gauge('tier', 'Loyalty tier', 1, 1, { sub: 'Top tier reached', label: pretty(tierNow.name) });

  const earnedBySource = ledger.filter((r) => r.points > 0);
  const redeemed = Math.abs(ledger.filter((r) => r.points < 0).reduce((s, r) => s + r.points, 0));
  const fromSignups = ledger.find((r) => r._id === 'AGENT_SIGNUP')?.points || 0;
  const fromReferrals = ledger.find((r) => r._id === 'REFERRAL')?.points || 0;

  // ---- account health ----
  const activeAccounts = byStatus.find((r) => r._id === 'active')?.n || 0;
  const activationPct = all.total ? Math.round((activeAccounts / all.total) * 100) : 0;

  return {
    headline: today.total
      ? `You registered ${pl(today.total, 'account')} today and earned ${today.points} points.`
      : 'Register someone today and earn 10 loyalty points.',
    widgets: [
      kpi('today', 'Signups today', today.total, { icon: 'users', tab: 'agent-signups', hint: split(today), spark: daily.slice(-14).map((d) => d.users + d.organizations) }),
      kpi('week', 'Last 7 days', period('7d').total, { icon: 'calendar', tab: 'agent-signups', hint: split(period('7d')) }),
      kpi('month', 'Last 30 days', period('30d').total, { icon: 'trend', tab: 'agent-signups', ...withTrend(growth) }),
      kpi('orgs', 'Organizations registered', all.orgs, { icon: 'building', tab: 'agent-signups', hint: `${pl(all.users, 'user')} registered too` }),
      kpi('balance', 'Points balance', u.loyalty?.points || 0, { icon: 'gift', hint: `${pretty(tierNow.name)} tier${redeemed ? ` · ${redeemed} redeemed` : ''}` }),
      kpi('lifetime', 'Lifetime points', life, { icon: 'star', hint: `${fromSignups} from signups · ${fromReferrals} from referrals` }),

      area('signups-daily', 'Signups per day', daily,
        [{ key: 'users', label: 'Users' }, { key: 'organizations', label: 'Organizations' }], { subtitle: 'Last 30 days' }),
      list('periods', 'Breakdown by period', cuts.map(([k]) => {
        const x = period(k);
        return { title: PERIOD_LABELS[k], subtitle: split(x), meta: `+${x.points} pts`, badge: { text: String(x.total), tone: x.total ? 'blue' : 'gray' }, tab: 'agent-signups' };
      }), { span: 4 }),

      bars('by-role', 'Who you registered', byRole.map((r) => ({ label: pretty(r._id), value: r.n })),
        [{ key: 'value', label: 'Accounts' }], { horizontal: true, span: 4 }),
      donut('kind', 'Users vs organizations', [{ label: 'Users', value: all.users }, { label: 'Organizations', value: all.orgs }], { empty: 'No signups yet' }),
      donut('org-types', 'Organization types', slices(byOrgType), { empty: 'No organizations yet' }),

      tierGauge,
      donut('points-source', 'Where your points come from',
        earnedBySource.map((r) => ({ label: POINT_SOURCES[r._id] || pretty(String(r._id).toLowerCase()), value: r.points })),
        { empty: 'No points yet' }),
      gauge('activation', 'Activation rate', activeAccounts, all.total || 1,
        { sub: `${activeAccounts} of ${all.total} accounts verified and approved`, label: `${activationPct}%` }),

      area('points-daily', 'Points earned per day', pointsDaily, [{ key: 'points', label: 'Points' }], { subtitle: 'Last 30 days' }),
      donut('status', 'Status of accounts you registered', slices(byStatus), { empty: 'No signups yet' }),

      list('recent-signups', 'Latest signups', recent.map((s) => ({
        title: s.organization?.name || s.user?.fullName || 'Removed account',
        subtitle: [pretty(s.role), s.user?.email].filter(Boolean).join(' · '),
        meta: ymd(s.createdAt),
        badge: !s.user ? { text: 'Removed', tone: 'gray' }
          : !s.user.isApproved ? { text: 'Awaiting approval', tone: 'amber' }
          : s.user.isVerified ? { text: 'Verified', tone: 'green' } : { text: 'Not verified', tone: 'gray' },
        tab: 'agent-signups',
      })), { empty: 'No signups yet' }),
      list('recent-points', 'Latest points', recentPoints.map((t) => ({
        title: POINT_SOURCES[t.action] || (t.action === 'REDEEM' ? 'Points redeemed' : pretty(String(t.action).toLowerCase())),
        subtitle: ymd(t.createdAt),
        meta: `${t.points > 0 ? '+' : ''}${t.points} pts`,
        badge: t.points > 0 ? { text: 'Earned', tone: 'green' } : { text: 'Spent', tone: 'red' },
      })), { empty: 'No points yet' }),
    ],
  };
}

/* ============================== SUPER ADMIN =========================== */

async function adminOverview() {
  const m = { unit: 'month' };
  const [
    users, orgs, pendingOrgs, appts, gmv, labs, signups, roles, typeRows, aAppt, aLab, aShop, rShop, rLab,
    viewed, pendingList, topRated,
  ] = await Promise.all([
    User.countDocuments({}),
    Organization.countDocuments({ status: 'approved' }),
    Organization.countDocuments({ status: 'pending' }),
    trend(Appointment, {}),
    trend(PharmacyOrder, { paymentStatus: 'paid' }, { total: '$total' }),
    trend(LabOrder, {}),
    series(User, {}, { users: { $sum: 1 } }),
    groupCount(User, {}, '$role'),
    Organization.aggregate([{ $group: { _id: { t: '$type', s: '$status' }, n: { $sum: 1 } } }]),
    series(Appointment, {}, { appointments: { $sum: 1 } }, m),
    series(LabOrder, {}, { labOrders: { $sum: 1 } }, m),
    series(PharmacyOrder, { status: { $nin: ['awaiting_payment', 'cancelled'] } }, { pharmacyOrders: { $sum: 1 } }, m),
    series(PharmacyOrder, { paymentStatus: 'paid' }, { pharmacy: { $sum: '$total' } }, m),
    series(LabOrder, { paymentStatus: 'paid' }, { labs: { $sum: '$totalAmount' } }, m),
    Organization.find({ status: 'approved' }).sort('-viewsCount').limit(6).select('name viewsCount').lean(),
    Organization.find({ status: 'pending' }).sort('-createdAt').limit(5).select('name type createdAt').lean(),
    Organization.find({ status: 'approved', ratingCount: { $gt: 0 } }).sort('-ratingAverage -ratingCount').limit(5)
      .select('name type ratingAverage ratingCount').lean(),
  ]);

  const types = [...new Set(typeRows.map((r) => r._id.t))];
  const at = (t, s) => typeRows.find((r) => r._id.t === t && r._id.s === s)?.n || 0;

  return {
    headline: `${pl(pendingOrgs, 'organization')} waiting for approval.`,
    widgets: [
      kpi('users', 'Total users', users, { icon: 'users' }),
      kpi('orgs', 'Active organizations', orgs, { icon: 'building' }),
      kpi('pending', 'Pending approvals', pendingOrgs, { icon: 'shield', tone: pendingOrgs ? 'amber' : undefined, hint: 'Organizations' }),
      kpi('appts', 'Appointments (30 days)', appts.cur, { icon: 'calendar', ...withTrend(appts) }),
      kpi('gmv', 'Pharmacy sales (30 days)', gmv.cur, { icon: 'bag', format: 'currency', ...withTrend(gmv) }),
      kpi('labs', 'Lab orders (30 days)', labs.cur, { icon: 'flask', ...withTrend(labs) }),

      area('signups', 'New users', signups, [{ key: 'users', label: 'Sign-ups' }], { subtitle: 'Last 30 days' }),
      donut('roles', 'Users by role', slices(roles)),
      area('activity', 'Platform activity', zip(aAppt, aLab, aShop),
        [{ key: 'appointments', label: 'Appointments' }, { key: 'labOrders', label: 'Lab orders' }, { key: 'pharmacyOrders', label: 'Pharmacy orders' }],
        { subtitle: 'Last 6 months' }),
      bars('orgs-type', 'Organizations by type', types.map((t) => ({ label: pretty(t), approved: at(t, 'approved'), pending: at(t, 'pending'), suspended: at(t, 'suspended') })),
        [{ key: 'approved', label: 'Approved' }, { key: 'pending', label: 'Pending' }, { key: 'suspended', label: 'Suspended' }], { stacked: true, span: 4 }),
      bars('revenue', 'Paid orders volume', zip(rShop, rLab), [{ key: 'pharmacy', label: 'Pharmacy' }, { key: 'labs', label: 'Labs' }],
        { stacked: true, format: 'currency', subtitle: 'Last 6 months', span: 6 }),
      bars('viewed', 'Most viewed organizations', viewed.map((o) => ({ label: o.name, value: o.viewsCount || 0 })), [{ key: 'value', label: 'Views' }],
        { horizontal: true, span: 6 }),

      list('pending-orgs', 'Waiting for approval', pendingList.map((o) => ({
        title: o.name, subtitle: pretty(o.type), meta: ymd(o.createdAt), badge: { text: 'Pending', tone: 'amber' }, tab: 'organizations',
      })), { empty: 'Nothing waiting for approval' }),
      list('top-rated', 'Top rated organizations', topRated.map((o) => ({
        title: o.name, subtitle: pretty(o.type), meta: `★ ${o.ratingAverage} (${o.ratingCount})`,
      })), { empty: 'No ratings yet' }),
    ],
  };
}

/* ================================ ROUTE =============================== */

const BUILDERS = {
  patient: patientOverview,
  doctor: clinicalOverview,
  nurse: clinicalOverview,
  hospital_admin: clinicalOverview,
  lab_tech: labOverview,
  pharmacist: pharmacyOverview,
  mortuary_officer: memorialOverview,
  cemetery_officer: memorialOverview,
    agent: agentOverview,  
  super_admin: adminOverview,
};
const NEEDS_ORG = ['nurse', 'hospital_admin', 'lab_tech', 'pharmacist', 'mortuary_officer', 'cemetery_officer', 'agent'];

export const getOverview = handle(async (req, res) => {
  const u = await User.findById(req.user._id)
    .select('fullName role organization loyalty ratingAverage ratingCount likesCount viewsCount sharesCount').lean();
    console.log(u)
  if (!u) throw new HttpError(401, 'Account not found');
  const build = BUILDERS[u.role];
  if (!build) throw new HttpError(403, 'No dashboard for this role');

 let out;
const orgRequired = NEEDS_ORG.includes(u.role) && u.role !== 'agent';

if (orgRequired && !u.organization) {
  out = {
    headline: 'Your account is not linked to an organization yet.',
    widgets: [notice('Your account is not linked to an organization yet. Ask your administrator to add you, then refresh this page.')],
  };
} else {
  out = await build(u);
}
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { role: u.role, generatedAt: new Date(), ...out } });
});