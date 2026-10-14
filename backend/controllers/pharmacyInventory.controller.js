import {
  Drug, Batch, StockMovement, Supplier, GoodsReceipt, Sale, DRUG_FORMS, SCHEDULES,
} from '../models/Pharmacy.js';
import { HttpError, handle, parsePagination } from '../utils/engagement.js';
import {
  escapeRegex, positiveInt, nonNegInt, money, objectId, pick, withTx, audit,
} from '../utils/pharmacy.js';
import { moveStock } from '../services/stock.service.js';

const DRUG_FIELDS = [
  'genericName', 'brandName', 'strength', 'form', 'route', 'packSize', 'unit', 'category',
  'manufacturer', 'barcode', 'nafdacNumber', 'schedule', 'coldChain', 'highAlert',
  'sellingPrice', 'reorderLevel', 'maxStock', 'isActive', 'images',
];
// NOTE: 'stock' and 'lastReceivedAt' are deliberately NOT in DRUG_FIELDS.
// Stock only changes through receipts, sales, adjustments and quarantine.

function cleanImages(v) {
  if (!Array.isArray(v)) throw new HttpError(400, 'images must be an array of URLs');
  const urls = [...new Set(v.map((u) => String(u || '').trim()).filter(Boolean))];
  if (urls.length > 8) throw new HttpError(400, 'You can add at most 8 images');
  if (urls.some((u) => !/^https:\/\/\S+$/i.test(u))) throw new HttpError(400, 'Each image must be a valid https URL');
  return urls;
}

function validateDrug(d, partial = false) {
  if (!partial || d.genericName !== undefined) {
    if (!String(d.genericName || '').trim()) throw new HttpError(400, 'Generic name is required');
    d.genericName = String(d.genericName).trim();
  }
  if (!partial || d.sellingPrice !== undefined) d.sellingPrice = money(d.sellingPrice, 'Selling price');
  if (d.form !== undefined && !DRUG_FORMS.includes(d.form)) throw new HttpError(400, 'Invalid dosage form');
  if (d.schedule !== undefined && !SCHEDULES.includes(d.schedule)) throw new HttpError(400, 'Invalid drug class');
  if (d.reorderLevel !== undefined) d.reorderLevel = nonNegInt(d.reorderLevel, 'Reorder level');

  // optional numeric: blank means "no limit"
  if (d.maxStock !== undefined) {
    if (d.maxStock === '' || d.maxStock === null) delete d.maxStock;
    else d.maxStock = nonNegInt(d.maxStock, 'Max stock');
  }

  // blank values should fall back to the schema defaults instead of saving ''
  if (d.barcode !== undefined && !String(d.barcode).trim()) delete d.barcode;
  if (d.unit !== undefined && !String(d.unit).trim()) delete d.unit;

  // (this used to sit after `return d`, so images were never validated)
  if (d.images !== undefined) d.images = cleanImages(d.images);

  return d;
}

const dupGuard = (err) => {
  if (err.code === 11000) throw new HttpError(409, 'Another drug already uses that barcode or batch number');
  throw err;
};

/* ============================ CATALOG ============================== */

export const listDrugs = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 100);
  const q = String(req.query.q || '').trim();
  const filter = { pharmacy: req.pharmacy._id };
  if (req.query.active !== 'all') filter.isActive = true;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ genericName: rx }, { brandName: rx }, { barcode: q }];
  }

  // out  = was received before, now at zero
  // new  = created but never received (not "out of stock")
  // low  = at or under the reorder level, but only drugs that have been stocked
  if (req.query.stock === 'out') { filter.stock = 0; filter.lastReceivedAt = { $exists: true }; }
  if (req.query.stock === 'new') { filter.stock = 0; filter.lastReceivedAt = { $exists: false }; }
  if (req.query.stock === 'low') {
    filter.$expr = { $lte: ['$stock', '$reorderLevel'] };
    filter.lastReceivedAt = { $exists: true };
  }
  if (req.query.inStock) filter.stock = { $gt: 0 };

  const [drugs, total] = await Promise.all([
    Drug.find(filter).sort('genericName brandName').skip(skip).limit(limit).lean(),
    Drug.countDocuments(filter),
  ]);

  const now = new Date();
  const agg = await Batch.aggregate([
    { $match: { drug: { $in: drugs.map((d) => d._id) }, quantity: { $gt: 0 } } },
    {
      $group: {
        _id: '$drug',
        sellable: { $sum: { $cond: [{ $gt: ['$expiryDate', now] }, '$quantity', 0] } },
        expired: { $sum: { $cond: [{ $gt: ['$expiryDate', now] }, 0, '$quantity'] } },
        nearestExpiry: { $min: { $cond: [{ $gt: ['$expiryDate', now] }, '$expiryDate', null] } },
      },
    },
  ]);
  const byDrug = new Map(agg.map((a) => [String(a._id), a]));

  let data = drugs.map((d) => {
    const a = byDrug.get(String(d._id));
    return { ...d, sellable: a?.sellable || 0, expired: a?.expired || 0, nearestExpiry: a?.nearestExpiry || null };
  });
  if (req.query.inStock) data = data.filter((d) => d.sellable > 0);

  res.json({ success: true, data, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const createDrug = handle(async (req, res) => {
  const body = validateDrug(pick(req.body, DRUG_FIELDS));

  try {
    // A new drug always starts empty and "never stocked" (no lastReceivedAt).
    // Stock is added later through receiveStock.
    const drug = await Drug.create({
      ...body,
      pharmacy: req.pharmacy._id,
      stock: 0,
      images: body.images ?? [],
    });
    await audit(req, 'drug.create', 'Drug', drug._id, { name: drug.genericName });
    res.status(201).json({ success: true, data: drug });
  } catch (err) { dupGuard(err); }
});

export const updateDrug = handle(async (req, res) => {
  objectId(req.params.id, 'drug id');
  const body = validateDrug(pick(req.body, DRUG_FIELDS), true);
  const before = await Drug.findOne({ _id: req.params.id, pharmacy: req.pharmacy._id }).select('sellingPrice');
  if (!before) throw new HttpError(404, 'Drug not found');
  try {
    const drug = await Drug.findByIdAndUpdate(before._id, { $set: body }, { new: true, runValidators: true });
    if (body.sellingPrice !== undefined && body.sellingPrice !== before.sellingPrice) {
      await audit(req, 'drug.price_change', 'Drug', drug._id, { from: before.sellingPrice, to: body.sellingPrice });
    }
    res.json({ success: true, data: drug });
  } catch (err) { dupGuard(err); }
});

export const getDrug = handle(async (req, res) => {
  objectId(req.params.id, 'drug id');
  const drug = await Drug.findOne({ _id: req.params.id, pharmacy: req.pharmacy._id }).lean();
  if (!drug) throw new HttpError(404, 'Drug not found');
  res.json({ success: true, data: drug });
});

export const listBatches = handle(async (req, res) => {
  objectId(req.params.id, 'drug id');
  const batches = await Batch.find({ pharmacy: req.pharmacy._id, drug: req.params.id })
    .sort('expiryDate').populate('supplier', 'name').lean();
  res.json({ success: true, data: batches });
});

export const listMovements = handle(async (req, res) => {
  objectId(req.params.id, 'drug id');
  const { page, limit, skip } = parsePagination(req.query, 100);
  const filter = { pharmacy: req.pharmacy._id, drug: req.params.id };
  const [items, total] = await Promise.all([
    StockMovement.find(filter).sort('-createdAt').skip(skip).limit(limit)
      .populate('by', 'fullName').populate('batch', 'batchNo').lean(),
    StockMovement.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

/**
 * DELETE /pharmacy/drugs/:id   (manager)
 * A drug with stock, stock history or sales is archived (isActive=false) so records stay intact.
 * A drug that was never used is deleted for good.
 */
export const deleteDrug = handle(async (req, res) => {
  objectId(req.params.id, 'drug id');
  const drug = await Drug.findOne({ _id: req.params.id, pharmacy: req.pharmacy._id });
  if (!drug) throw new HttpError(404, 'Drug not found');

  const [hasMoves, hasSales] = await Promise.all([
    StockMovement.exists({ drug: drug._id }),
    Sale.exists({ 'items.drug': drug._id }), // Sale is now imported (it was missing before)
  ]);

  if (hasMoves || hasSales || drug.stock > 0) {
    drug.isActive = false;
    await drug.save();
    await audit(req, 'drug.archive', 'Drug', drug._id, { name: drug.genericName });
    return res.json({ success: true, data: { archived: true } });
  }

  await Batch.deleteMany({ pharmacy: req.pharmacy._id, drug: drug._id });
  await drug.deleteOne();
  await audit(req, 'drug.delete', 'Drug', drug._id, { name: drug.genericName });
  res.json({ success: true, data: { archived: false } });
});

/* ============================ RECEIVING ============================ */

/**
 * POST /pharmacy/receipts   (manager)
 * body: { supplierId?, invoiceNo?, notes?, items: [{ drugId, batchNo, expiryDate, quantity, costPrice }] }
 * Adds stock by batch. Receiving an existing batch number adds to that batch.
 * Stamps Drug.lastReceivedAt so the drug counts as "stocked" from now on.
 */
export const receiveStock = handle(async (req, res) => {
  const { supplierId, invoiceNo, notes, items } = req.body || {};
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new HttpError(400, 'Add between 1 and 100 items');
  if (supplierId) {
    objectId(supplierId, 'supplier id');
    if (!(await Supplier.exists({ _id: supplierId, pharmacy: req.pharmacy._id }))) throw new HttpError(404, 'Supplier not found');
  }

  const lines = items.map((i, n) => {
    const batchNo = String(i.batchNo || '').trim();
    const expiryDate = new Date(i.expiryDate);
    if (!batchNo) throw new HttpError(400, `Row ${n + 1}: batch number is required`);
    if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) throw new HttpError(400, `Row ${n + 1}: expiry date must be in the future`);
    return {
      drugId: objectId(i.drugId, 'drug id'), batchNo, expiryDate,
      quantity: positiveInt(i.quantity, `Row ${n + 1}: quantity`),
      costPrice: money(i.costPrice, `Row ${n + 1}: cost price`),
    };
  });

  const receipt = await withTx(async (session) => {
    const done = [];
    let totalCost = 0;
    for (const l of lines) {
      const drug = await Drug.findOne({ _id: l.drugId, pharmacy: req.pharmacy._id }).session(session);
      if (!drug) throw new HttpError(404, 'One of the drugs was not found');

      const existing = await Batch.findOne({ pharmacy: req.pharmacy._id, drug: drug._id, batchNo: l.batchNo }).session(session);
      if (existing && existing.expiryDate.toISOString().slice(0, 10) !== l.expiryDate.toISOString().slice(0, 10)) {
        throw new HttpError(400, `Batch ${l.batchNo} of ${drug.genericName} already exists with a different expiry date`);
      }
      const batch = await Batch.findOneAndUpdate(
        { pharmacy: req.pharmacy._id, drug: drug._id, batchNo: l.batchNo },
        {
          $inc: { quantity: l.quantity, receivedQty: l.quantity },
          $set: { costPrice: l.costPrice, ...(supplierId ? { supplier: supplierId } : {}) },
          $setOnInsert: { expiryDate: l.expiryDate, receivedAt: new Date() },
        },
        { upsert: true, new: true, session }
      );
      // moveStock writes the ledger row and updates Drug.stock
      await moveStock({
        session, pharmacy: req.pharmacy._id, drug: drug._id, batch: batch._id, delta: l.quantity,
        type: 'receipt', unitCost: l.costPrice, reason: invoiceNo ? `Invoice ${invoiceNo}` : 'Stock received', by: req.user._id,
      });
      // lastReceivedAt is what separates "never stocked" from "sold out"
      await Drug.updateOne(
        { _id: drug._id },
        { $set: { costPrice: l.costPrice, lastReceivedAt: new Date() } },
        { session }
      );
      totalCost += l.quantity * l.costPrice;
      done.push({ drug: drug._id, name: drug.genericName, batchNo: l.batchNo, expiryDate: l.expiryDate, quantity: l.quantity, costPrice: l.costPrice });
    }
    const [doc] = await GoodsReceipt.create(
      [{ pharmacy: req.pharmacy._id, supplier: supplierId, invoiceNo, notes, items: done, totalCost, receivedBy: req.user._id }],
      { session }
    );
    await audit(req, 'stock.receive', 'GoodsReceipt', doc._id, { items: done.length, totalCost }, session);
    return doc;
  });

  res.status(201).json({ success: true, data: receipt });
});

export const listReceipts = handle(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 100);
  const filter = { pharmacy: req.pharmacy._id };
  const [items, total] = await Promise.all([
    GoodsReceipt.find(filter).sort('-createdAt').skip(skip).limit(limit)
      .populate('supplier', 'name').populate('receivedBy', 'fullName').lean(),
    GoodsReceipt.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

/* ============================ ADJUSTMENTS ========================== */

/**
 * POST /pharmacy/adjustments   (manager)
 * body: { batchId, mode: 'count' | 'writeoff', quantity, reason }
 *  count    -> quantity is the physically counted amount; the difference is recorded
 *  writeoff -> quantity is how many units to remove (damaged, expired, lost)
 */
export const adjustStock = handle(async (req, res) => {
  const { batchId, mode, reason } = req.body || {};
  objectId(batchId, 'batch id');
  if (!['count', 'writeoff'].includes(mode)) throw new HttpError(400, 'mode must be "count" or "writeoff"');
  const why = String(reason || '').trim();
  if (why.length < 3) throw new HttpError(400, 'Give a reason for this change');

  await withTx(async (session) => {
    const batch = await Batch.findOne({ _id: batchId, pharmacy: req.pharmacy._id }).session(session);
    if (!batch) throw new HttpError(404, 'Batch not found');

    let delta;
    if (mode === 'writeoff') {
      const q = positiveInt(req.body.quantity);
      if (q > batch.quantity) throw new HttpError(400, `Only ${batch.quantity} units in this batch`);
      delta = -q;
    } else {
      delta = nonNegInt(req.body.quantity, 'Counted quantity') - batch.quantity;
      if (delta === 0) throw new HttpError(400, 'The count matches the system. Nothing to change.');
    }

    const res1 = await Batch.updateOne({ _id: batch._id, quantity: batch.quantity }, { $inc: { quantity: delta } }, { session });
    if (!res1.modifiedCount) throw new HttpError(409, 'Batch changed while you were editing. Try again.');
    await moveStock({
      session, pharmacy: req.pharmacy._id, drug: batch.drug, batch: batch._id, delta,
      type: mode === 'writeoff' ? 'writeoff' : 'adjustment', reason: why, by: req.user._id,
    });
    await audit(req, `stock.${mode}`, 'Batch', batch._id, { delta, reason: why, batchNo: batch.batchNo }, session);
  });

  res.json({ success: true });
});

/**
 * POST /pharmacy/batches/:id/quarantine   (manager)
 * body: { action: 'release' | 'writeoff', quantity }
 * Returned stock lands in quarantine. Release puts it back on sale; writeoff destroys it.
 */
export const resolveQuarantine = handle(async (req, res) => {
  objectId(req.params.id, 'batch id');
  const { action } = req.body || {};
  if (!['release', 'writeoff'].includes(action)) throw new HttpError(400, 'action must be "release" or "writeoff"');
  const q = positiveInt(req.body.quantity);

  await withTx(async (session) => {
    const upd = await Batch.findOneAndUpdate(
      { _id: req.params.id, pharmacy: req.pharmacy._id, quarantinedQty: { $gte: q } },
      { $inc: { quarantinedQty: -q, ...(action === 'release' ? { quantity: q } : {}) } },
      { new: true, session }
    );
    if (!upd) throw new HttpError(400, 'Not enough quarantined stock in this batch');
    await moveStock({
      session, pharmacy: req.pharmacy._id, drug: upd.drug, batch: upd._id,
      delta: action === 'release' ? q : -q,
      type: action === 'release' ? 'quarantine_release' : 'quarantine_writeoff',
      countsTowardStock: action === 'release',
      reason: action === 'release' ? 'Released from quarantine' : 'Quarantined stock destroyed', by: req.user._id,
    });
    await audit(req, `quarantine.${action}`, 'Batch', upd._id, { quantity: q }, session);
  });

  res.json({ success: true });
});

/* ============================ SUPPLIERS ============================ */

export const listSuppliers = handle(async (req, res) => {
  const data = await Supplier.find({ pharmacy: req.pharmacy._id, isActive: true }).sort('name').lean();
  res.json({ success: true, data });
});

export const createSupplier = handle(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) throw new HttpError(400, 'Supplier name is required');
  const s = await Supplier.create({ ...pick(req.body, ['contactPerson', 'phone', 'email', 'address']), name, pharmacy: req.pharmacy._id });
  res.status(201).json({ success: true, data: s });
});

export const updateSupplier = handle(async (req, res) => {
  objectId(req.params.id, 'supplier id');
  const s = await Supplier.findOneAndUpdate(
    { _id: req.params.id, pharmacy: req.pharmacy._id },
    { $set: pick(req.body, ['name', 'contactPerson', 'phone', 'email', 'address', 'isActive']) },
    { new: true, runValidators: true }
  );
  if (!s) throw new HttpError(404, 'Supplier not found');
  res.json({ success: true, data: s });
});

/* ============================== ALERTS ============================= */

export const getAlerts = handle(async (req, res) => {
  // The old try/catch logged the error but never sent a response, so the request hung.
  // `handle` already catches errors and returns them properly.
  const pharmacy = req.pharmacy._id;
  const now = new Date();
  const soon = new Date(now.getTime() + 90 * 864e5);
  const [lowStock, expiring, expired] = await Promise.all([
    // lastReceivedAt filter: drugs that were never stocked are not "low stock"
    Drug.find({ pharmacy, isActive: true, lastReceivedAt: { $exists: true }, $expr: { $lte: ['$stock', '$reorderLevel'] } })
      .select('genericName brandName strength stock reorderLevel').sort('stock').limit(50).lean(),
    Batch.find({ pharmacy, quantity: { $gt: 0 }, expiryDate: { $gt: now, $lte: soon } })
      .populate('drug', 'genericName brandName strength').sort('expiryDate').limit(50).lean(),
    Batch.find({ pharmacy, quantity: { $gt: 0 }, expiryDate: { $lte: now } })
      .populate('drug', 'genericName brandName strength').sort('expiryDate').limit(50).lean(),
  ]);
  res.json({ success: true, data: { lowStock, expiring, expired } });
});