import crypto from 'crypto';
import mongoose from 'mongoose';
import Prescription from '../models/Prescription.js';
import { Drug, Batch, Sale, PAY_METHODS } from '../models/Pharmacy.js';
import { HttpError, handle, parsePagination, sameId } from '../utils/engagement.js';
import {
  escapeRegex, positiveInt, money, objectId, withTx, audit, dateRange,
} from '../utils/pharmacy.js';
import { allocateFEFO, moveStock } from '../services/stock.service.js';
import { notify } from '../services/notify.service.js';

/* ======================== PRESCRIPTION ACCESS ======================= */

// A pharmacy may open a prescription if the patient shares prescriptions publicly,
// the pharmacist has the code, or this pharmacy already attended to it.
const canAccessRx = (rx, code, pharmacyId) =>
  !!rx.patient?.prescriptionPublic ||
  (!!code && String(code).trim().toUpperCase() === rx.code) ||
  sameId(rx.pharmacy, pharmacyId);

const rxDTO = (p) => ({
  id: p._id,
  code: p.code,
  status: p.status,
  issuedAt: p.createdAt,
  purpose: p.purpose,
  prescribedBy: p.doctor?.fullName,
  hospital: p.organization?.name,
  patient: p.patient && {
    id: p.patient._id, name: p.patient.fullName, dateOfBirth: p.patient.dateOfBirth, gender: p.patient.gender,
  },
  items: (p.items || []).map((it, index) => ({
    ...it,
    index,
    remaining: it.quantity != null ? Math.max(0, it.quantity - (it.dispensedQty || 0)) : null,
  })),
});

/**
 * GET /pharmacy/prescriptions/:id?code=RX-XXXXXX
 * Returns the prescription plus, for every drug line, in-stock catalog matches (suggestions)
 * and what this pharmacy has already given for it (previous).
 * Suggestions are only hints: the pharmacist must pick the exact product.
 */
export const getPrescription = handle(async (req, res) => {
  objectId(req.params.id, 'prescription id');
  const rx = await Prescription.findById(req.params.id)
    .populate('patient', 'fullName dateOfBirth gender prescriptionPublic')
    .populate('doctor', 'fullName')
    .populate('organization', 'name')
    .lean();
  if (!rx) throw new HttpError(404, 'Prescription not found');
  if (!canAccessRx(rx, req.query.code, req.pharmacy._id)) {
    throw new HttpError(403, "This patient hasn't shared prescriptions. Ask them for the prescription code.");
  }

  const suggestions = await Promise.all(
    (rx.items || []).map((it) => {
      const word = String(it.medicine || '').split(/[\s,()]+/).find((w) => w.length >= 3);
      if (!word) return [];
      const rgx = new RegExp(escapeRegex(word), 'i');
      return Drug.find({
        pharmacy: req.pharmacy._id, isActive: true, stock: { $gt: 0 }, $or: [{ genericName: rgx }, { brandName: rgx }],
      }).select('genericName brandName strength form sellingPrice stock schedule').limit(6).lean();
    })
  );

  const previous = await Sale.find({ prescription: rx._id, pharmacy: req.pharmacy._id })
    .select('receiptNo createdAt total items.name items.quantity').sort('-createdAt').lean();

  res.json({ success: true, data: { ...rxDTO(rx), suggestions, previous } });
});

/* ============================== SELLING ============================= */

const newReceiptNo = () =>
  `RC-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/**
 * POST /pharmacy/sales
 * body: {
 *   prescriptionId?,                       // present = dispensing a prescription, absent = walk-in sale
 *   items: [{ drugId, quantity, rxItemIndex? }],
 *   discount?, paymentMethod, amountPaid?, insurer?, authCode?,
 *   customerName?, customerPhone?, externalRx?: { prescriber, note },
 *   finalize?: boolean,                    // prescription only: mark fully dispensed even if some lines are unfilled
 *   code?                                  // prescription code, if the patient hasn't made prescriptions public
 * }
 * Stock deduction (FEFO), the ledger, the sale record and the prescription update
 * all happen in ONE transaction, so stock and billing can never drift apart.
 */
export const createSale = handle(async (req, res) => {
  const b = req.body || {};
  const pharmacyId = req.pharmacy._id;

  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 50) throw new HttpError(400, 'Add between 1 and 50 items');
  if (!PAY_METHODS.includes(b.paymentMethod)) throw new HttpError(400, 'Choose a payment method');
  if (b.paymentMethod === 'insurance' && !String(b.insurer || '').trim()) throw new HttpError(400, 'Enter the HMO / insurer name');

  const type = b.prescriptionId ? 'prescription' : 'walk_in';
  const lines = b.items.map((i) => ({
    drugId: objectId(i.drugId, 'drug id'),
    quantity: positiveInt(i.quantity),
    rxItemIndex: i.rxItemIndex == null ? null : Number(i.rxItemIndex),
  }));
  if (type === 'prescription') {
    objectId(b.prescriptionId, 'prescription id');
    if (lines.some((l) => !Number.isInteger(l.rxItemIndex))) throw new HttpError(400, 'Link each item to a prescription line');
  }

  const saleId = new mongoose.Types.ObjectId();
  let patientId = null;
  let rxCode = null;

  const sale = await withTx(async (session) => {
    let rx = null;
    if (type === 'prescription') {
      rx = await Prescription.findById(b.prescriptionId).populate('patient', 'prescriptionPublic').session(session).lean();
      if (!rx) throw new HttpError(404, 'Prescription not found');
      if (!canAccessRx(rx, b.code, pharmacyId)) throw new HttpError(403, 'You do not have access to this prescription');
      if (['dispensed', 'cancelled'].includes(rx.status)) throw new HttpError(409, `This prescription is already ${rx.status}`);
      patientId = rx.patient?._id;
      rxCode = rx.code;
    }

    const items = [];
    const usedPerRxLine = {};
    let subtotal = 0;

    for (const l of lines) {
      const drug = await Drug.findOne({ _id: l.drugId, pharmacy: pharmacyId, isActive: true }).session(session);
      if (!drug) throw new HttpError(404, 'A selected drug no longer exists');

      if (type === 'walk_in') {
        if (drug.schedule === 'controlled') {
          throw new HttpError(403, `${drug.genericName} is a controlled drug. It can only be dispensed against a prescription on the system.`);
        }
        if (drug.schedule === 'prescription_only' && !String(b.externalRx?.prescriber || '').trim()) {
          throw new HttpError(400, `${drug.genericName} needs a prescription. Enter the prescriber's name.`);
        }
      } else {
        const rxItem = rx.items[l.rxItemIndex];
        if (!rxItem) throw new HttpError(400, 'That prescription line does not exist');
        usedPerRxLine[l.rxItemIndex] = (usedPerRxLine[l.rxItemIndex] || 0) + l.quantity;
        const remaining = rxItem.quantity != null ? rxItem.quantity - (rxItem.dispensedQty || 0) : Infinity;
        if (usedPerRxLine[l.rxItemIndex] > remaining) {
          throw new HttpError(400, `Only ${remaining} left to dispense for "${rxItem.medicine}"`);
        }
      }

      const batches = await allocateFEFO({ session, pharmacy: pharmacyId, drug: drug._id, qty: l.quantity });
      await moveStock({
        session, pharmacy: pharmacyId, drug: drug._id, batch: batches[0]?.batch, delta: -l.quantity,
        type: 'sale', ref: { model: 'Sale', id: saleId }, by: req.user._id,
        reason: type === 'prescription' ? `Rx ${rxCode}` : 'Walk-in sale',
      });

      const lineTotal = Math.round(drug.sellingPrice * l.quantity * 100) / 100;
      subtotal += lineTotal;
      items.push({
        drug: drug._id,
        name: [drug.genericName, drug.brandName && `(${drug.brandName})`, drug.strength].filter(Boolean).join(' '),
        schedule: drug.schedule, batches, quantity: l.quantity, unitPrice: drug.sellingPrice, lineTotal,
        rxItemIndex: l.rxItemIndex ?? undefined,
      });
    }

    const discount = b.discount ? money(b.discount, 'Discount') : 0;
    if (discount > subtotal) throw new HttpError(400, 'Discount cannot be more than the total');
    if (!req.isManager && discount > subtotal * 0.1) throw new HttpError(403, 'Discounts above 10% need the pharmacy manager');
    const total = Math.round((subtotal - discount) * 100) / 100;

    let amountPaid;
    let paymentStatus;
    if (b.paymentMethod === 'insurance') {
      amountPaid = b.amountPaid ? Math.min(money(b.amountPaid, 'Co-pay'), total) : 0; // patient co-pay
      paymentStatus = 'claim_pending';
    } else if (b.paymentMethod === 'credit') {
      amountPaid = b.amountPaid ? Math.min(money(b.amountPaid, 'Amount paid'), total) : 0;
      paymentStatus = amountPaid >= total ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';
    } else {
      amountPaid = total;
      paymentStatus = 'paid';
    }

    const [doc] = await Sale.create([{
      _id: saleId, pharmacy: pharmacyId, receiptNo: newReceiptNo(), type,
      prescription: rx?._id, patient: patientId || undefined,
      customerName: b.customerName, customerPhone: b.customerPhone,
      externalRx: type === 'walk_in' ? { prescriber: b.externalRx?.prescriber, note: b.externalRx?.note } : undefined,
      soldBy: req.user._id, items, subtotal, discount, total,
      paymentMethod: b.paymentMethod, amountPaid, paymentStatus,
      insurer: b.insurer, authCode: b.authCode, notes: b.notes,
    }], { session });

    if (rx) {
      const inc = {};
      Object.entries(usedPerRxLine).forEach(([idx, q]) => { inc[`items.${idx}.dispensedQty`] = q; });
      const fresh = await Prescription.findByIdAndUpdate(rx._id, { $inc: inc }, { new: true, session });
      const allDone = fresh.items.every((it) => it.quantity != null && (it.dispensedQty || 0) >= it.quantity);
      await Prescription.updateOne(
        { _id: rx._id },
        { $set: { status: b.finalize || allDone ? 'dispensed' : 'partially_dispensed', dispensedBy: req.user._id, pharmacy: pharmacyId, dispensedAt: new Date() } },
        { session }
      );
    }

    await audit(req, 'sale.create', 'Sale', doc._id, { total, type, receiptNo: doc.receiptNo }, session);
    return doc;
  });

  if (patientId) {
    notify([patientId], {
      type: 'pharmacy:dispensed',
      title: 'Your medication was dispensed',
      body: `${req.pharmacy.name} attended to prescription ${rxCode}. You can now rate your experience.`,
      data: { pharmacyId: String(pharmacyId), saleId: String(sale._id) },
    }).catch(() => {});
  }

  res.status(201).json({ success: true, data: sale });
});

/* ============================== HISTORY ============================= */

export const listSales = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 100);
  const { from, to } = dateRange(req.query);
  const filter = { pharmacy: req.pharmacy._id, createdAt: { $gte: from, $lte: to } };
   if (['prescription', 'walk_in', 'online'].includes(req.query.type)) filter.type = req.query.type;

  if (req.query.patient) filter.patient = objectId(req.query.patient, 'patient id');
  const q = String(req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ receiptNo: rx }, { customerName: rx }];
  }

  const [items, total] = await Promise.all([
    Sale.find(filter).sort('-createdAt').skip(skip).limit(limit)
      .select('-returns').populate('soldBy', 'fullName').populate('patient', 'fullName').lean(),
    Sale.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getSale = handle(async (req, res) => {
  objectId(req.params.id, 'sale id');
  const sale = await Sale.findOne({ _id: req.params.id, pharmacy: req.pharmacy._id })
    .populate('soldBy', 'fullName').populate('patient', 'fullName').populate('prescription', 'code').lean();
  if (!sale) throw new HttpError(404, 'Sale not found');
  res.json({ success: true, data: sale });
});

/* ============================== RETURNS ============================= */

/**
 * POST /pharmacy/sales/:id/return   (manager)
 * body: { items: [{ itemIndex, quantity }], reason }
 * Refund is proportional to what was paid (discounts included). Returned stock goes
 * to QUARANTINE, not back on the shelf, until a manager releases or writes it off.
 */
export const returnSale = handle(async (req, res) => {
  objectId(req.params.id, 'sale id');
  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 3) throw new HttpError(400, 'Give a reason for the return');
  if (!Array.isArray(req.body?.items) || !req.body.items.length) throw new HttpError(400, 'Choose the items being returned');

  const out = await withTx(async (session) => {
    const sale = await Sale.findOne({ _id: req.params.id, pharmacy: req.pharmacy._id }).session(session);
    if (!sale) throw new HttpError(404, 'Sale not found');
    if (sale.status === 'refunded') throw new HttpError(409, 'This sale is already fully refunded');

    const ratio = sale.subtotal > 0 ? (sale.subtotal - sale.discount) / sale.subtotal : 1;
    let amount = 0;
    const returned = [];

    for (const r of req.body.items) {
      const idx = Number(r.itemIndex);
      const q = positiveInt(r.quantity);
      const item = sale.items[idx];
      if (!item) throw new HttpError(400, 'Unknown item in this sale');
      if (q > item.quantity - item.returnedQty) throw new HttpError(400, `You can only return ${item.quantity - item.returnedQty} of ${item.name}`);

      let left = q;
      for (const bt of item.batches) {
        if (left <= 0) break;
        const take = Math.min(bt.quantity - (bt.returned || 0), left);
        if (take <= 0) continue;
        await Batch.updateOne({ _id: bt.batch }, { $inc: { quarantinedQty: take } }, { session });
        await moveStock({
          session, pharmacy: req.pharmacy._id, drug: item.drug, batch: bt.batch, delta: take,
          type: 'return_quarantine', countsTowardStock: false, reason: `Return on ${sale.receiptNo}: ${reason}`,
          ref: { model: 'Sale', id: sale._id }, by: req.user._id,
        });
        bt.returned = (bt.returned || 0) + take;
        left -= take;
      }
      item.returnedQty += q;
      amount += item.unitPrice * q * ratio;
      returned.push({ itemIndex: idx, quantity: q });
    }

    amount = Math.min(Math.round(amount * 100) / 100, sale.total - sale.refundedTotal);
    sale.refundedTotal = Math.round((sale.refundedTotal + amount) * 100) / 100;
    sale.returns.push({ items: returned, amount, reason, by: req.user._id });
    sale.status = sale.items.every((i) => i.returnedQty >= i.quantity) ? 'refunded' : 'partially_refunded';
    await sale.save({ session });
    await audit(req, 'sale.return', 'Sale', sale._id, { amount, reason }, session);
    return sale;
  });

  res.json({ success: true, data: out });
});