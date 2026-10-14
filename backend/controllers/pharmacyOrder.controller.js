// import crypto from 'crypto';
// import { PharmacyOrder } from '../models/PharmacyOrder.js';

// import { HttpError, handle, parsePagination } from '../utils/engagement.js';
// import { escapeRegex, objectId } from '../utils/pharmacy.js';
// import { notify } from '../services/notify.service.js';
// import { cancelMyOrder } from './shopController.js';
// import { cancelPaidOrder } from './shopController.js';


// const ACTIVE = ['confirmed', 'preparing', 'ready', 'out_for_delivery'];
// const MAX_ATTEMPTS = 5;

// const mine = async (req, withCode = false) => {
//   objectId(req.params.id, 'order id');
//   const q = PharmacyOrder.findOne({ _id: req.params.id, pharmacy: req.pharmacy._id });
//   const o = await (withCode ? q.select('+code +codeAttempts') : q);
//   if (!o) throw new HttpError(404, 'Order not found');
//   return o;
// };

// const tell = (o, title, body) =>
//   notify([o.customer], { type: 'shop:order_update', title, body, data: { orderId: String(o._id) } }).catch(() => {});

// // GET /pharmacy/orders?status=active|confirmed|...&q=
// export const listOrders = handle(async (req, res) => {
//   const { page, limit, skip } = parsePagination(req.query, 50);
//   const filter = { pharmacy: req.pharmacy._id };
//   const s = String(req.query.status || 'active');
//   filter.status = s === 'active' ? { $in: ACTIVE } : s;
//   if (s === 'awaiting_payment') filter.status = { $in: ['__none__'] }; // staff never see unpaid orders
//   const q = String(req.query.q || '').trim();
//   if (q) filter.orderNo = new RegExp(escapeRegex(q), 'i');

//   const [rows, total] = await Promise.all([
//     PharmacyOrder.find(filter).sort(s === 'active' ? 'createdAt' : '-createdAt').skip(skip).limit(limit)
//       .populate('customer', 'fullName phone').lean(),
//     PharmacyOrder.countDocuments(filter),
//   ]);
//   res.json({ success: true, data: rows, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
// });

// // PATCH /pharmacy/orders/:id/status  body: { status, rider?: { name, phone } }
// export const setStatus = handle(async (req, res) => {
//   const o = await mine(req);
//   const next = req.body?.status;
//   console.log(req.body)
//   const flow = {
//     confirmed: ['preparing'],
//     preparing: [o.fulfilment === 'pickup' ? 'ready' : 'out_for_delivery'],
//   };
//   if (!(flow[o.status] || []).includes(next)) throw new HttpError(409, `Can't move an order from ${o.status.replace('_', ' ')} to ${String(next).replace('_', ' ')}`);

//   const set = { status: next };
//   if (next === 'out_for_delivery') {
//     const name = String(req.body?.rider?.name || '').trim();
//     const phone = String(req.body?.rider?.phone || '').trim();
//     if (!name || !phone) throw new HttpError(400, "Enter the rider's name and phone");
//     set['delivery.rider'] = { name, phone };
//   }
//   const notes = { preparing: 'Pharmacy is preparing your order', ready: 'Ready for pickup', out_for_delivery: 'Rider is on the way' };
//   const out = await PharmacyOrder.findOneAndUpdate(
//     { _id: o._id, status: o.status },
//     { $set: set, $push: { timeline: { status: next, note: notes[next] } } },
//     { new: true }
//   ).populate('customer', 'fullName phone');
//   if (!out) throw new HttpError(409, 'This order was just updated by someone else');

//   const msg = { preparing: 'is being prepared', ready: 'is ready for pickup. Bring your 4-digit code.', out_for_delivery: 'is on its way. Give the rider your 4-digit code.' }[next];
//   tell(o, 'Order update', `${o.orderNo} ${msg}`);
//   res.json({ success: true, data: out });
// });

// // POST /pharmacy/orders/:id/verify  body: { code }
// // Pickup: the customer tells the pharmacist. Delivery: the customer tells the rider, who gives it to the pharmacy.
// export const verifyCode = handle(async (req, res) => {
//   const o = await mine(req, true);
//   if (!['ready', 'out_for_delivery'].includes(o.status)) throw new HttpError(409, 'This order is not ready to be handed over yet');
//   if (o.codeAttempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong codes. Ask the customer to contact support.');

//   const given = String(req.body?.code || '').trim();
//   const a = Buffer.from(given.padEnd(4, ' '));
//   const b = Buffer.from(o.code);
//   const ok = /^\d{4}$/.test(given) && a.length === b.length && crypto.timingSafeEqual(a, b);
//   if (!ok) {
//     await PharmacyOrder.updateOne({ _id: o._id }, { $inc: { codeAttempts: 1 } });
//     throw new HttpError(400, `Wrong code. ${Math.max(0, MAX_ATTEMPTS - o.codeAttempts - 1)} attempts left.`);
//   }

//   const done = await PharmacyOrder.findOneAndUpdate(
//     { _id: o._id, status: o.status },
//     { $set: { status: 'completed' }, $push: { timeline: { status: 'completed', note: o.fulfilment === 'pickup' ? 'Collected' : 'Delivered' } } },
//     { new: true }
//   );
//   if (!done) throw new HttpError(409, 'This order was just updated');
//   tell(o, 'Order complete', `${o.orderNo} has been ${o.fulfilment === 'pickup' ? 'collected' : 'delivered'}. Thank you!`);
//   res.json({ success: true, data: done });
// });

// // POST /pharmacy/orders/:id/reject  body: { reason }  (before it leaves the pharmacy)
// export const rejectOrder = handle(async (req, res) => {
//   const o = await mine(req);
//   const reason = String(req.body?.reason || '').trim();
//   if (reason.length < 3) throw new HttpError(400, 'Give a reason');
//   if (!['confirmed', 'preparing'].includes(o.status)) throw new HttpError(409, 'Only orders that have not left the pharmacy can be rejected');
//   await cancelPaidOrder(o, { by: req.user._id, reason });
//   res.json({ success: true });
// });





import crypto from 'crypto';
import { PharmacyOrder } from '../models/PharmacyOrder.js';
import { HttpError, handle, parsePagination } from '../utils/engagement.js';
import { escapeRegex, objectId } from '../utils/pharmacy.js';
import { notify } from '../services/notify.service.js';
import { cancelPaidOrder } from './shopController.js';

const ACTIVE = ['confirmed', 'preparing', 'ready', 'out_for_delivery'];
const LISTABLE = ['completed', 'cancelled', ...ACTIVE];
const MAX_ATTEMPTS = 5;
const STATUS_LABEL = (s) => String(s).replace(/_/g, ' ');

const mine = async (req, withCode = false) => {
  objectId(req.params.id, 'order id');
  const q = PharmacyOrder.findOne({ _id: req.params.id, pharmacy: req.pharmacy._id });
  const o = await (withCode ? q.select('+code +codeAttempts') : q);
  if (!o) throw new HttpError(404, 'Order not found');
  return o;
};

const tell = (o, title, body) =>
  notify([o.customer], { type: 'shop:order_update', title, body, data: { orderId: String(o._id) } }).catch(() => {});

// Accept data from the JSON body OR the query string, so the endpoint works
// whichever way the client's api() helper sends it.
const input = (req) => ({ ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) });

// GET /pharmacy/orders?status=active|completed|cancelled|<status>&q=
export const listOrders = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 50);
  const s = String(req.query.status || 'active');
  if (s !== 'active' && !LISTABLE.includes(s)) throw new HttpError(400, 'Unknown status');

  // Staff never see unpaid orders
  const filter = { pharmacy: req.pharmacy._id, status: s === 'active' ? { $in: ACTIVE } : s };
  const q = String(req.query.q || '').trim();
  if (q) filter.orderNo = new RegExp(escapeRegex(q), 'i');

  const [rows, total] = await Promise.all([
    PharmacyOrder.find(filter).sort(s === 'active' ? 'createdAt' : '-createdAt').skip(skip).limit(limit)
      .populate('customer', 'fullName phone').lean(),
    PharmacyOrder.countDocuments(filter),
  ]);
  res.json({ success: true, data: rows, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// PUT or POST /pharmacy/orders/:id/status
// { status: 'preparing' | 'ready' | 'out_for_delivery', rider?: { name, phone } }
// (riderName / riderPhone are also accepted)
export const setStatus = handle(async (req, res) => {
  const o = await mine(req);
  const data = input(req);
  const next = String(data.status || '').trim();
  if (!next) throw new HttpError(400, 'No status was sent. Choose the next step for this order.');

  const flow = {
    confirmed: ['preparing'],
    preparing: [o.fulfilment === 'pickup' ? 'ready' : 'out_for_delivery'],
  };
  if (!(flow[o.status] || []).includes(next)) {
    throw new HttpError(409, `Can't move an order from ${STATUS_LABEL(o.status)} to ${STATUS_LABEL(next)}`);
  }

  const set = { status: next };
  if (next === 'out_for_delivery') {
    const name = String(data.rider?.name || data.riderName || '').trim();
    const phone = String(data.rider?.phone || data.riderPhone || '').trim();
    if (!name || !phone) throw new HttpError(400, "Enter the rider's name and phone");
    set['delivery.rider'] = { name, phone };
  }

  const notes = { preparing: 'Pharmacy is preparing your order', ready: 'Ready for pickup', out_for_delivery: 'Rider is on the way' };
  const out = await PharmacyOrder.findOneAndUpdate(
    { _id: o._id, status: o.status }, // guards against two staff clicking at once
    { $set: set, $push: { timeline: { status: next, note: notes[next] } } },
    { new: true }
  ).populate('customer', 'fullName phone');
  if (!out) throw new HttpError(409, 'This order was just updated by someone else. Refresh and try again.');

  const msg = {
    preparing: 'is being prepared',
    ready: 'is ready for pickup. Bring your 4-digit code.',
    out_for_delivery: 'is on its way. Give the rider your 4-digit code.',
  }[next];
  tell(o, 'Order update', `${o.orderNo} ${msg}`);
  res.json({ success: true, data: out });
});

// POST /pharmacy/orders/:id/verify  { code }
// Pickup: the customer tells the pharmacist. Delivery: the customer tells the rider, who gives it to the pharmacy.
export const verifyCode = handle(async (req, res) => {
  const o = await mine(req, true);
  if (!['ready', 'out_for_delivery'].includes(o.status)) throw new HttpError(409, 'This order is not ready to be handed over yet');
  if (o.codeAttempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Too many wrong codes. Ask the customer to contact support.');

  const given = String(input(req).code || '').trim();
  const a = Buffer.from(given.padEnd(4, ' '));
  const b = Buffer.from(o.code);
  const ok = /^\d{4}$/.test(given) && a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    await PharmacyOrder.updateOne({ _id: o._id }, { $inc: { codeAttempts: 1 } });
    throw new HttpError(400, `Wrong code. ${Math.max(0, MAX_ATTEMPTS - o.codeAttempts - 1)} attempts left.`);
  }

  const done = await PharmacyOrder.findOneAndUpdate(
    { _id: o._id, status: o.status },
    { $set: { status: 'completed' }, $push: { timeline: { status: 'completed', note: o.fulfilment === 'pickup' ? 'Collected' : 'Delivered' } } },
    { new: true }
  );
  if (!done) throw new HttpError(409, 'This order was just updated. Refresh and try again.');
  tell(o, 'Order complete', `${o.orderNo} has been ${o.fulfilment === 'pickup' ? 'collected' : 'delivered'}. Thank you!`);
  res.json({ success: true, data: done });
});

// POST /pharmacy/orders/:id/reject  { reason }  (before it leaves the pharmacy)
export const rejectOrder = handle(async (req, res) => {
  const o = await mine(req);
  const reason = String(input(req).reason || '').trim();
  if (reason.length < 3) throw new HttpError(400, 'Give a reason');
  if (!['confirmed', 'preparing'].includes(o.status)) throw new HttpError(409, 'Only orders that have not left the pharmacy can be rejected');
  await cancelPaidOrder(o, { by: req.user._id, reason });
  res.json({ success: true });
});