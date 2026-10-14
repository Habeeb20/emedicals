import crypto from 'crypto';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import User, { LoyaltyTransaction } from '../models/User.js';
import { Drug, Batch, Sale } from '../models/Pharmacy.js';
import { PharmacyOrder, Voucher, CODE_VISIBLE } from '../models/PharmacyOrder.js';
import { HttpError, handle, parsePagination } from '../utils/engagement.js';
import { escapeRegex, positiveInt, objectId, withTx } from '../utils/pharmacy.js';
import { allocateFEFO, moveStock } from '../services/stock.service.js';
import { notify } from '../services/notify.service.js';

import { searchAddress, deliveryQuote } from '../services/geo.services.js';
import { paystack } from '../services/paystack.service.js';

const POINT_VALUE = Number(process.env.POINT_VALUE_NGN || 5); // ₦ per loyalty point
const PAY_WINDOW_MS = 30 * 60 * 1000;                          // unpaid orders expire after 30 min
const r2 = (n) => Math.round(n * 100) / 100;
const oidOf = (v) => new mongoose.Types.ObjectId(String(v));

/* ============================== DTOs ============================== */

export const pharmacyDTO = (o) => ({
  id: o._id, name: o.name, logo: o.logo?.url, about: o.about, address: o.address, phone: o.phone,
  email: o.email, licenseNumber: o.licenseNumber, openingHours: o.openingHours, is24Hours: o.is24Hours,
  offersDelivery: o.offersDelivery, ratingAverage: o.ratingAverage, ratingCount: o.ratingCount, likesCount: o.likesCount,
});

const drugDTO = (d, available, pharmacy) => ({
  id: d._id, genericName: d.genericName, brandName: d.brandName, strength: d.strength, form: d.form,
  packSize: d.packSize, unit: d.unit, category: d.category, manufacturer: d.manufacturer,
  nafdacNumber: d.nafdacNumber, schedule: d.schedule, sellingPrice: d.sellingPrice, images: d.images || [],
  available, orderable: d.schedule === 'otc' && available > 0, pharmacy,
});

const orderDTO = (o) => ({
  ...o,
  id: o._id,
  code: CODE_VISIBLE.includes(o.status) ? o.code : undefined,
  codeAttempts: undefined,
});

// Sellable = in date and not quarantined (quarantined stock is tracked separately on the batch)
const sellableMap = async (ids) => {
  const rows = await Batch.aggregate([
    { $match: { drug: { $in: ids.map(oidOf) }, expiryDate: { $gt: new Date() }, quantity: { $gt: 0 } } },
    { $group: { _id: '$drug', qty: { $sum: '$quantity' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.qty]));
};

/* ============================== CATALOG =========================== */

const PHARMACY_FIELDS = 'name logo about address phone email licenseNumber openingHours is24Hours offersDelivery ratingAverage ratingCount likesCount status type';

export const listCategories = handle(async (_req, res) => {
  const cats = await Drug.distinct('category', { isActive: true, stock: { $gt: 0 }, category: { $nin: [null, ''] } });
  res.json({ success: true, data: cats.sort() });
});

export const listDrugs = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 40);
  const pharmacies = await Organization.find({ type: 'pharmacy', status: 'approved' }).select(PHARMACY_FIELDS).lean();
  const byId = new Map(pharmacies.map((p) => [String(p._id), p]));

  const filter = { isActive: true,  };
  
  if (req.query.pharmacy) {
   
    objectId(req.query.pharmacy, 'pharmacy id');
    filter.pharmacy = byId.has(String(req.query.pharmacy)) ? req.query.pharmacy : null;
  }
  if (req.query.category) filter.category = String(req.query.category);

  const q = String(req.query.q || '').trim();

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ genericName: rx }, { brandName: rx }, { category: rx }];
  }
  const sort = { price_asc: { sellingPrice: 1 }, price_desc: { sellingPrice: -1 } }[req.query.sort] || { genericName: 1 };

  const [rows, total] = await Promise.all([
    Drug.find(filter).sort(sort).skip(skip).limit(limit).select('-costPrice -reorderLevel -maxStock').lean(),
    Drug.countDocuments(filter),
  ]);
  const stock = await sellableMap(rows.map((d) => d._id));
  const data = rows.map((d) => {
    const p = byId.get(String(d.pharmacy));
    return drugDTO(d, stock.get(String(d._id)) || 0, { id: p._id, name: p.name, state: p.address?.state, city: p.address?.city, offersDelivery: p.offersDelivery });
  });
  
  res.json({ success: true, data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getDrug = handle(async (req, res) => {
  objectId(req.params.id, 'drug id');
  const d = await Drug.findOne({ _id: req.params.id, isActive: true }).select('-costPrice -reorderLevel -maxStock').lean();
  if (!d) throw new HttpError(404, 'Drug not found');
  const pharmacy = await Organization.findOne({ _id: d.pharmacy, type: 'pharmacy', status: 'approved' }).select(PHARMACY_FIELDS).lean();
  if (!pharmacy) throw new HttpError(404, 'Drug not found');

  const stock = await sellableMap([d._id]);
  // Same drug at other pharmacies
  const others = await Drug.find({
    _id: { $ne: d._id }, isActive: true, stock: { $gt: 0 }, genericName: new RegExp(`^${escapeRegex(d.genericName)}$`, 'i'),
    ...(d.strength ? { strength: d.strength } : {}),
  }).select('sellingPrice pharmacy').limit(6).lean();
  const orgs = await Organization.find({ _id: { $in: others.map((o) => o.pharmacy) }, type: 'pharmacy', status: 'approved' }).select('name address.state address.city').lean();
  const orgMap = new Map(orgs.map((o) => [String(o._id), o]));
  const alternatives = others.filter((o) => orgMap.has(String(o.pharmacy))).map((o) => ({
    drugId: o._id, price: o.sellingPrice, pharmacy: { id: o.pharmacy, name: orgMap.get(String(o.pharmacy)).name, city: orgMap.get(String(o.pharmacy)).address?.city },
  }));

  res.json({ success: true, data: { ...drugDTO(d, stock.get(String(d._id)) || 0, pharmacyDTO(pharmacy)), alternatives } });
});

export const geocode = handle(async (req, res) => {
  res.json({ success: true, data: await searchAddress(req.query.q) });
});

export const getRewards = handle(async (req, res) => {
  const u = await User.findById(req.user._id).select('loyalty.points fullName phone').lean();
  res.json({ success: true, data: { points: u?.loyalty?.points || 0, pointValue: POINT_VALUE, fullName: u?.fullName, phone: u?.phone } });
});

/* ============================== PRICING =========================== */

async function applyVoucher(code, { userId, pharmacyId, subtotal }) {
  const v = await Voucher.findOne({ code: String(code).trim().toUpperCase(), isActive: true }).lean();
  if (!v || (v.expiresAt && v.expiresAt < new Date())) throw new HttpError(400, 'This voucher is invalid or has expired');
  if (v.pharmacy && String(v.pharmacy) !== String(pharmacyId)) throw new HttpError(400, 'This voucher is not valid for this pharmacy');
  if (v.usageLimit && v.usedCount >= v.usageLimit) throw new HttpError(400, 'This voucher has been fully redeemed');
  if (subtotal < v.minOrder) throw new HttpError(400, `Spend at least ₦${v.minOrder.toLocaleString()} to use this voucher`);
  const used = await PharmacyOrder.countDocuments({ customer: userId, 'voucher.code': v.code, status: { $ne: 'cancelled' } });
  if (used >= (v.perUserLimit || 1)) throw new HttpError(400, 'You have already used this voucher');

  let discount = v.type === 'percent' ? (subtotal * v.value) / 100 : v.value;
  if (v.maxDiscount) discount = Math.min(discount, v.maxDiscount);
  return { id: v._id, code: v.code, discount: Math.min(r2(discount), subtotal) };
}

/**
 * Single source of truth for prices. Used by both preview and checkout, so the
 * numbers the customer sees are the numbers they pay. Nothing is trusted from the client.
 */
async function priceOrder(b, userId, { strict }) {
  const pharmacy = await Organization.findOne({ _id: objectId(b.pharmacyId, 'pharmacy id'), type: 'pharmacy', status: 'approved' }).lean();
  if (!pharmacy) throw new HttpError(404, 'Pharmacy not found');

  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) throw new HttpError(400, 'Your cart is empty');
  const wanted = new Map();
  for (const i of b.items) {
    const id = String(objectId(i.drugId, 'drug id'));
    wanted.set(id, (wanted.get(id) || 0) + positiveInt(i.quantity));
  }

  const drugs = await Drug.find({ _id: { $in: [...wanted.keys()] }, pharmacy: pharmacy._id, isActive: true }).lean();
  console.log(drugs)
  if (drugs.length !== wanted.size) throw new HttpError(404, 'Some items are no longer sold by this pharmacy. Please refresh your cart.');
  const stock = await sellableMap(drugs.map((d) => d._id));

  const items = drugs.map((d) => {
    const qty = wanted.get(String(d._id));
    const name = [d.genericName, d.brandName && `(${d.brandName})`].filter(Boolean).join(' ');
    if (d.schedule !== 'otc') throw new HttpError(403, `${name} needs a prescription and can't be ordered online. Visit the pharmacy.`);
    const left = stock.get(String(d._id)) || 0;
    if (qty > left) throw new HttpError(409, left ? `Only ${left} of ${name} left` : `${name} is out of stock`);
    return { drug: d._id, name, strength: d.strength, image: d.images?.[0], unitPrice: d.sellingPrice, quantity: qty, lineTotal: r2(d.sellingPrice * qty) };
  });
  const subtotal = r2(items.reduce((s, i) => s + i.lineTotal, 0));

  const fulfilment = b.fulfilment === 'delivery' ? 'delivery' : 'pickup';
  let deliveryFee = 0;
  let delivery;
  if (fulfilment === 'delivery') {
    if (!pharmacy.offersDelivery) throw new HttpError(422, 'This pharmacy does not offer delivery. Choose pickup.');
    const d = b.delivery || {};
    const address = String(d.address || '').trim();
    if (address.length < 5) throw new HttpError(400, 'Enter your delivery address');
    const quote = await deliveryQuote(pharmacy, { lat: Number(d.lat), lng: Number(d.lng) });
    deliveryFee = quote.fee;
    delivery = {
      recipient: String(d.recipient || '').trim(), phone: String(d.phone || '').trim(), address,
      note: String(d.note || '').trim().slice(0, 200), lat: Number(d.lat), lng: Number(d.lng), distanceKm: quote.distanceKm,
    };
    if (strict && (!delivery.recipient || !/^\+?\d{10,14}$/.test(delivery.phone))) throw new HttpError(400, 'Enter the recipient name and a valid phone number');
  }

  let voucher = null;
  let voucherError = null;
  if (b.voucherCode && String(b.voucherCode).trim()) {
    try { voucher = await applyVoucher(b.voucherCode, { userId, pharmacyId: pharmacy._id, subtotal }); }
    catch (e) { if (strict || !(e instanceof HttpError)) throw e; voucherError = e.message; }
  }

  const user = await User.findById(userId).select('email loyalty.points').lean();
  const payable = r2(subtotal + deliveryFee - (voucher?.discount || 0));
  let pointsUsed = 0;
  if (b.usePoints) {
    pointsUsed = Math.min(user?.loyalty?.points || 0, Math.ceil(payable / POINT_VALUE));
  }
  const pointsDiscount = Math.min(r2(pointsUsed * POINT_VALUE), payable);
  const total = r2(payable - pointsDiscount);

  return {
    pharmacy, user, items, subtotal, fulfilment, delivery, deliveryFee, voucher, voucherError,
    points: { used: pointsUsed, discount: pointsDiscount }, total, amountDue: total,
  };
}

export const previewCheckout = handle(async (req, res) => {
  console.log(req.body)
  const p = await priceOrder(req.body || {}, req.user._id, { strict: false });
  res.json({
    success: true,
    data: {
      items: p.items, subtotal: p.subtotal, fulfilment: p.fulfilment, deliveryFee: p.deliveryFee,
      distanceKm: p.delivery?.distanceKm, voucher: p.voucher && { code: p.voucher.code, discount: p.voucher.discount },
      voucherError: p.voucherError, points: p.points, total: p.total, amountDue: p.amountDue,
    },
  });
});

/* ============================ ORDER LIFECYCLE ===================== */

const newOrderNo = () => `OD-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const newRef = () => `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const newCode = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

async function giveBackPerks(order) {
  if (order.points?.used > 0) {
    await User.findByIdAndUpdate(order.customer, { $inc: { 'loyalty.points': order.points.used } });
    await LoyaltyTransaction.create({
      user: order.customer, action: 'REFUND', points: order.points.used, key: `REFUND:${order._id}`, note: `Order ${order.orderNo}`,
    }).catch(() => {});
  }
  if (order.voucher?.code) await Voucher.updateOne({ code: order.voucher.code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}

/** Cancel an order that hasn't been paid. Safe to call twice. */
export async function cancelUnpaid(orderId, note) {
  const order = await PharmacyOrder.findOneAndUpdate(
    { _id: orderId, status: 'awaiting_payment' },
    { $set: { status: 'cancelled' }, $push: { timeline: { status: 'cancelled', note } } },
    { new: true }
  );
  if (order) await giveBackPerks(order);
  return order;
}

const expireStale = (customer) =>
  PharmacyOrder.find({ customer, status: 'awaiting_payment', createdAt: { $lt: new Date(Date.now() - PAY_WINDOW_MS) } })
    .select('_id').lean()
    .then((rows) => Promise.all(rows.map((r) => cancelUnpaid(r._id, 'Payment window expired'))));

const notifyStaff = async (order) => {
  const staff = await User.find({ organization: order.pharmacy, role: 'pharmacist' }).select('_id').lean();
  if (!staff.length) return;
  notify(staff.map((s) => s._id), {
    type: 'pharmacy:new_order', title: 'New online order',
    body: `${order.orderNo} · ${order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'} · ₦${order.total.toLocaleString()}`,
    data: { orderId: String(order._id) },
  }).catch(() => {});
};

/**
 * Called once payment is confirmed (Paystack verify, webhook, or fully covered by points/voucher).
 * Idempotent: only the first caller flips awaiting_payment -> confirmed. Stock is deducted
 * (FEFO) and a Sale is written in the same transaction.
 */
export async function activateOrder(orderId) {
  let order;
  try {
    order = await withTx(async (session) => {
      const o = await PharmacyOrder.findOneAndUpdate(
        { _id: orderId, status: 'awaiting_payment' },
        { $set: { status: 'confirmed', paymentStatus: 'paid' }, $push: { timeline: { status: 'confirmed', note: 'Payment received' } } },
        { new: true, session }
      );
      if (!o) return null;

      const saleId = new mongoose.Types.ObjectId();
      const saleItems = [];
      for (const it of o.items) {
        const batches = await allocateFEFO({ session, pharmacy: o.pharmacy, drug: it.drug, qty: it.quantity });
        await moveStock({
          session, pharmacy: o.pharmacy, drug: it.drug, batch: batches[0]?.batch, delta: -it.quantity,
          type: 'sale', ref: { model: 'Sale', id: saleId }, reason: `Online order ${o.orderNo}`,
        });
        saleItems.push({ drug: it.drug, name: it.name, schedule: 'otc', batches, quantity: it.quantity, unitPrice: it.unitPrice, lineTotal: it.lineTotal });
      }
      const discount = Math.min(o.subtotal, r2((o.voucher?.discount || 0) + (o.points?.discount || 0)));
      const net = r2(o.subtotal - discount);
      await Sale.create([{
        _id: saleId, pharmacy: o.pharmacy, receiptNo: o.orderNo, type: 'online', patient: o.customer,
        items: saleItems, subtotal: o.subtotal, discount, total: net, paymentMethod: 'card', amountPaid: net,
        paymentStatus: 'paid', notes: `Online order (${o.fulfilment})`,
      }], { session });
      await PharmacyOrder.updateOne({ _id: o._id }, { $set: { sale: saleId } }, { session });
      return o;
    });
  } catch (err) {
    if (!(err instanceof HttpError)) throw err; // transient problem: leave it awaiting, verify can be retried
    await failPaidOrder(orderId, err.message);
    throw new HttpError(409, 'Sorry, an item sold out while you were paying. You have been refunded.');
  }
  if (order) await notifyStaff(order);
  return order;
}

// Paid but we can't fulfil (stock ran out): cancel, refund money, give back points/voucher
async function failPaidOrder(orderId, reason) {
  const order = await PharmacyOrder.findOneAndUpdate(
    { _id: orderId, status: 'awaiting_payment' },
    { $set: { status: 'cancelled', paymentStatus: 'refunded' }, $push: { timeline: { status: 'cancelled', note: `Out of stock: ${reason}` } } },
    { new: true }
  );
  if (!order) return;
  await giveBackPerks(order);
  if (order.amountDue > 0 && order.paystackRef) await paystack.refund(order.paystackRef).catch(() => {});
  notify([order.customer], { type: 'shop:order_cancelled', title: 'Order cancelled', body: `${order.orderNo} could not be fulfilled. Any payment is being refunded.`, data: { orderId: String(order._id) } }).catch(() => {});
}

/** Verify with Paystack, then activate. Used by the verify route and by the webhook. */
export async function confirmPaymentByReference(reference) {
  const order = await PharmacyOrder.findOne({ paystackRef: reference });
  if (!order) return null;
  if (order.status !== 'awaiting_payment') return order;
  const tx = await paystack.verify(reference);
  if (tx.status !== 'success' || Number(tx.amount) !== Math.round(order.amountDue * 100)) return order;
  await activateOrder(order._id);
  return PharmacyOrder.findById(order._id);
}

/** Refund a paid order the pharmacy can't complete: stock back, money back, points/voucher back. */
export async function cancelPaidOrder(order, { by, reason }) {
  await withTx(async (session) => {
    const sale = order.sale && await Sale.findById(order.sale).session(session);
    for (const it of sale?.items || []) {
      for (const b of it.batches || []) {
        await Batch.updateOne({ _id: b.batch }, { $inc: { quantity: b.quantity } }, { session });
        await moveStock({
          session, pharmacy: order.pharmacy, drug: it.drug, batch: b.batch, delta: b.quantity, type: 'adjustment',
          reason: `Cancelled online order ${order.orderNo}`, ref: { model: 'Sale', id: sale._id }, by,
        });
      }
    }
    if (sale) { sale.status = 'refunded'; sale.refundedTotal = sale.total; await sale.save({ session }); }
    await PharmacyOrder.updateOne(
      { _id: order._id },
      { $set: { status: 'cancelled', paymentStatus: order.amountDue > 0 ? 'refunded' : order.paymentStatus }, $push: { timeline: { status: 'cancelled', note: reason } } },
      { session }
    );
  });
  await giveBackPerks(order);
  if (order.amountDue > 0 && order.paystackRef) await paystack.refund(order.paystackRef).catch(() => {});
  notify([order.customer], { type: 'shop:order_cancelled', title: 'Order cancelled', body: `${order.orderNo} was cancelled by the pharmacy: ${reason}. Any payment is being refunded.`, data: { orderId: String(order._id) } }).catch(() => {});
}

/* ============================== CHECKOUT ========================== */

const startPayment = async (order, email) => {
  const ref = newRef();
  await PharmacyOrder.updateOne({ _id: order._id }, { $set: { paystackRef: ref } });
  const init = await paystack.initialize({
    email, amount: Math.round(order.amountDue * 100), reference: ref,
    callback_url: `${process.env.CLIENT_URL}/shop/orders/${order._id}`,
    metadata: { orderId: String(order._id), orderNo: order.orderNo },
  });
  return init.authorization_url;
};

export const checkout = handle(async (req, res) => {
  const b = req.body || {};
  const p = await priceOrder(b, req.user._id, { strict: true });
  const orderNo = newOrderNo();
  let voucherTaken = false;
  let pointsTaken = 0;
  let order;

  try {
    if (p.voucher) {
      const ok = await Voucher.findOneAndUpdate(
        { _id: p.voucher.id, $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
        { $inc: { usedCount: 1 } }
      );
      if (!ok) throw new HttpError(409, 'This voucher has just been fully redeemed');
      voucherTaken = true;
    }
    if (p.points.used > 0) {
      await User.redeemPoints(req.user._id, p.points.used, `Order ${orderNo}`)
        .catch(() => { throw new HttpError(409, 'Your points balance changed. Please review your order.'); });
      pointsTaken = p.points.used;
    }
    order = await PharmacyOrder.create({
      orderNo, pharmacy: p.pharmacy._id, customer: req.user._id, items: p.items, fulfilment: p.fulfilment,
      contactPhone: String(b.phone || p.delivery?.phone || '').trim(), delivery: p.delivery,
      subtotal: p.subtotal, deliveryFee: p.deliveryFee,
      voucher: p.voucher ? { code: p.voucher.code, discount: p.voucher.discount } : undefined,
      points: p.points, total: p.total, amountDue: p.amountDue, code: newCode(),
      timeline: [{ status: 'awaiting_payment', note: 'Order placed' }],
    });
  } catch (err) {
    if (voucherTaken) await Voucher.updateOne({ _id: p.voucher.id }, { $inc: { usedCount: -1 } });
    if (pointsTaken) await giveBackPerks({ _id: new mongoose.Types.ObjectId(), customer: req.user._id, orderNo, points: { used: pointsTaken } });
    throw err;
  }

  if (order.amountDue <= 0) {
    await activateOrder(order._id);
    return res.status(201).json({ success: true, data: { orderId: order._id, authorizationUrl: null } });
  }
  try {
    const authorizationUrl = await startPayment(order, p.user.email);
    res.status(201).json({ success: true, data: { orderId: order._id, authorizationUrl } });
  } catch (err) {
    await cancelUnpaid(order._id, 'Could not start payment');
    throw err;
  }
});

/* ======================== CUSTOMER: ORDERS ======================== */

const loadMine = async (req) => {
  objectId(req.params.id, 'order id');
  const o = await PharmacyOrder.findOne({ _id: req.params.id, customer: req.user._id }).select('+code');
  if (!o) throw new HttpError(404, 'Order not found');
  return o;
};

export const listMyOrders = handle(async (req, res) => {
  await expireStale(req.user._id);
  const { page, limit, skip } = parsePagination(req.query, 50);
  const filter = { customer: req.user._id };
  const [rows, total] = await Promise.all([
    PharmacyOrder.find(filter).sort('-createdAt').skip(skip).limit(limit).populate('pharmacy', 'name').lean(),
    PharmacyOrder.countDocuments(filter),
  ]);
  res.json({ success: true, data: rows, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getMyOrder = handle(async (req, res) => {
  await expireStale(req.user._id);
  const o = await PharmacyOrder.findOne({ _id: objectId(req.params.id, 'order id'), customer: req.user._id }).select('+code')
    .populate('pharmacy', PHARMACY_FIELDS).lean();
  if (!o) throw new HttpError(404, 'Order not found');
  res.json({ success: true, data: { ...orderDTO(o), pharmacy: pharmacyDTO(o.pharmacy) } });
});

// Called by the order page after Paystack redirects back
export const verifyMyOrder = handle(async (req, res) => {
  const o = await loadMine(req);
  if (o.status === 'awaiting_payment' && o.paystackRef) await confirmPaymentByReference(o.paystackRef);
  res.json({ success: true, data: { status: (await PharmacyOrder.findById(o._id).select('status').lean()).status } });
});

export const payMyOrder = handle(async (req, res) => {
  const o = await loadMine(req);
  if (o.status !== 'awaiting_payment') throw new HttpError(409, 'This order is no longer awaiting payment');
  if (o.createdAt < new Date(Date.now() - PAY_WINDOW_MS)) { await cancelUnpaid(o._id, 'Payment window expired'); throw new HttpError(410, 'This order expired. Please place it again.'); }
  const u = await User.findById(req.user._id).select('email').lean();
  res.json({ success: true, data: { authorizationUrl: await startPayment(o, u.email) } });
});

export const cancelMyOrder = handle(async (req, res) => {
  const o = await loadMine(req);
  const done = await cancelUnpaid(o._id, 'Cancelled by you');
  if (!done) throw new HttpError(409, 'Only unpaid orders can be cancelled here. Contact the pharmacy for paid orders.');
  res.json({ success: true });
});

/* ============================ ADMIN =============================== */

export const createVoucher = handle(async (req, res) => {
  if (req.user.role !== 'super_admin') throw new HttpError(403, 'Admins only');
  const b = req.body || {};
  const v = await Voucher.create({
    code: b.code, type: b.type, value: b.value, maxDiscount: b.maxDiscount, minOrder: b.minOrder,
    pharmacy: b.pharmacy, expiresAt: b.expiresAt, usageLimit: b.usageLimit, perUserLimit: b.perUserLimit,
  });
  res.status(201).json({ success: true, data: v });
});