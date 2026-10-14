import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import CemeteryPlot from '../models/CemeteryPlot.js';
import MortuaryRecord from '../models/MortuaryRecord.js';
import MemorialBooking from '../models/MemorialBooking.js';
import LedgerEntry from '../models/LedgerEntry.js';
import { Review } from '../models/User.js';
import { wrap, HttpError, escapeRegex, paginate, getMyOrg, mortuaryOccupancy } from './memorialHelpers.js';

const str = (v, max = 200) => (v == null ? undefined : String(v).trim().slice(0, max) || undefined);
const num = (v, min = 0) => Math.max(Number(v) || 0, min);
const pick = (obj = {}, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

const loadBooking = async (id, org) => {
  const b = mongoose.isValidObjectId(id) ? await MemorialBooking.findOne({ _id: id, organization: org._id }) : null;
  if (!b) throw new HttpError(404, 'Booking not found');
  return b;
};
const recordPayStatus = (s) => (s === 'paid' ? 'paid' : s === 'part_paid' ? 'part_paid' : 'unpaid');

const releasePlot = (plotId) =>
  plotId && CemeteryPlot.updateOne({ _id: plotId, status: 'reserved' }, { $set: { status: 'available' }, $unset: { reservedBy: '', booking: '' } });

/* ------------------------------- OVERVIEW ------------------------------- */
// GET /memorial/manage/overview
export const overview = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 5, 1);
  since.setUTCHours(0, 0, 0, 0);
  const net = { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, { $multiply: ['$amount', -1] }, '$amount'] } };

  const [statusRows, monthly, allTime, outstanding, recent] = await Promise.all([
    MemorialBooking.aggregate([{ $match: { organization: org._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    LedgerEntry.aggregate([
      { $match: { organization: org._id, type: { $in: ['payment', 'refund'] }, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: net } },
      { $sort: { _id: 1 } },
    ]),
    LedgerEntry.aggregate([{ $match: { organization: org._id, type: { $in: ['payment', 'refund'] } } }, { $group: { _id: null, total: net } }]),
    MemorialBooking.aggregate([
      { $match: { organization: org._id, status: { $in: ['confirmed', 'admitted', 'completed'] }, chargesPosted: true } },
      { $group: { _id: null, total: { $sum: { $max: [0, { $subtract: ['$charges', '$amountPaid'] }] } } } },
    ]),
    MemorialBooking.find({ organization: org._id }).sort({ createdAt: -1 }).limit(6).select('reference kind status deceased.fullName contact.name quote paymentStatus createdAt'),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((r) => [r._id, r.n]));
  const monthKey = new Date().toISOString().slice(0, 7);
  const out = {
    success: true,
    org: { _id: org._id, name: org.name, type: org.type, status: org.status, logo: org.logo },
    bookings: byStatus,
    revenue: { allTime: allTime[0]?.total || 0, thisMonth: monthly.find((m) => m._id === monthKey)?.total || 0, outstanding: outstanding[0]?.total || 0 },
    revenueByMonth: monthly.map((m) => ({ month: m._id, total: m.total })),
    engagement: { likes: org.likesCount || 0, shares: org.sharesCount || 0, views: org.viewsCount || 0, rating: org.ratingAverage || 0, reviews: org.ratingCount || 0 },
    recent,
  };

  if (org.type === 'mortuary') out.occupancy = await mortuaryOccupancy(org);
  else {
    const rows = await CemeteryPlot.aggregate([{ $match: { cemetery: org._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
    out.plots = Object.fromEntries(['available', 'reserved', 'occupied'].map((s) => [s, rows.find((r) => r._id === s)?.n || 0]));
  }
  res.json(out);
});

/* ------------------------------- BOOKINGS ------------------------------- */
// GET /memorial/manage/bookings?status=&q=&page=
export const listBookings = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const { page, limit, skip } = paginate(req.query, 15);
  const filter = { organization: org._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ reference: rx }, { 'deceased.fullName': rx }, { 'contact.name': rx }, { 'contact.phone': rx }];
  }
  const [items, total] = await Promise.all([
    MemorialBooking.find(filter).populate('client', 'fullName email phone').populate('cemetery.plot', 'plotNumber section type').sort({ createdAt: -1 }).skip(skip).limit(limit),
    MemorialBooking.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

// GET /memorial/manage/bookings/:id  (booking + timeline + statement)
export const getManagedBooking = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const booking = await (await loadBooking(req.params.id, org)).populate([
    { path: 'client', select: 'fullName email phone' },
    { path: 'cemetery.plot', select: 'plotNumber section type price' },
    { path: 'history.by', select: 'fullName' },
  ]);
  const ledger = await LedgerEntry.find({ booking: booking._id }).sort({ createdAt: 1 }).populate('recordedBy', 'fullName');
  res.json({ success: true, booking, ledger });
});

const TRANSITIONS = {
  confirm: { from: ['pending'], kinds: ['mortuary', 'cemetery'] },
  reject: { from: ['pending'], kinds: ['mortuary', 'cemetery'] },
  cancel: { from: ['confirmed'], kinds: ['mortuary', 'cemetery'] },
  admit: { from: ['confirmed'], kinds: ['mortuary'] },
  embalm: { from: ['admitted'], kinds: ['mortuary'] },
  release: { from: ['admitted'], kinds: ['mortuary'] },
  complete: { from: ['confirmed'], kinds: ['cemetery'] },
};

const nextTag = async (org) => {
  const prefix = org.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'MQ';
  let n = (await MortuaryRecord.countDocuments({ mortuary: org._id })) + 1;
  const tag = () => `${prefix}-${String(n).padStart(4, '0')}`;
  while (await MortuaryRecord.exists({ mortuary: org._id, tagNumber: tag() })) n += 1;
  return tag();
};

// PATCH /memorial/manage/bookings/:id/status
// body: { action, note, override?, tagNumber?, storage{unit,slot}?, releasedTo?, idPresented?, burialDate? }
export const updateBookingStatus = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const booking = await loadBooking(req.params.id, org);
  const { action } = req.body;
  const note = str(req.body.note, 300);
  const rule = TRANSITIONS[action];
  if (!rule || !rule.kinds.includes(booking.kind) || !rule.from.includes(booking.status))
    throw new HttpError(400, `You can't ${action || 'do that to'} a ${booking.status} booking`);

  if (['release', 'complete'].includes(action) && booking.balance > 0.009 && !req.body.override)
    throw new HttpError(409, `There is an outstanding balance of ₦${booking.balance.toLocaleString()}. Record the payment, or confirm to proceed anyway.`);

  switch (action) {
    case 'confirm': {
      if (booking.kind === 'mortuary') {
        const occ = await mortuaryOccupancy(org);
        if (occ.capacity && occ.available <= 0) throw new HttpError(409, 'No free space left. Release a slot before confirming.');
      }
      if (!booking.chargesPosted) {
        const rows = booking.quoteLines
          .filter((l) => l.amount > 0)
          .map((l) => ({ organization: org._id, booking: booking._id, client: booking.client, type: 'charge', amount: l.amount, description: l.label, recordedBy: req.user._id }));
        if (rows.length) await LedgerEntry.insertMany(rows);
        booking.chargesPosted = true;
      }
      booking.status = 'confirmed';
      booking.log('confirmed', note || 'Booking confirmed', req.user);
      break;
    }
    case 'reject':
    case 'cancel': {
      if (action === 'reject' && !note) throw new HttpError(400, 'Give the family a short reason');
      booking.status = action === 'reject' ? 'rejected' : 'cancelled';
      booking.decisionNote = note;
      booking.log(booking.status, note || `Booking ${booking.status} by the facility`, req.user);
      if (booking.kind === 'cemetery') await releasePlot(booking.cemetery?.plot);
      break;
    }
    case 'admit': {
      const d = booking.deceased;
      const record = await MortuaryRecord.create({
        mortuary: org._id,
        tagNumber: str(req.body.tagNumber, 40) || (await nextTag(org)),
        deceased: { fullName: d.fullName, gender: d.gender, age: d.age, dateOfBirth: d.dateOfBirth },
        dateOfDeath: d.dateOfDeath || new Date(),
        placeOfDeath: d.placeOfDeath,
        causeOfDeath: d.causeOfDeath,
        broughtInBy: { name: booking.contact.name, phone: booking.contact.phone, relationship: booking.contact.relationship },
        nextOfKin: { name: booking.contact.name, phone: booking.contact.phone, relationship: booking.contact.relationship, address: booking.contact.address },
        storage: { unit: str(req.body.storage?.unit, 40), slot: str(req.body.storage?.slot, 40) },
        charges: booking.charges,
        paymentStatus: recordPayStatus(booking.paymentStatus),
        handledBy: req.user._id,
        booking: booking._id,
      });
      booking.mortuary.record = record._id;
      booking.status = 'admitted';
      booking.log('admitted', note || `Admitted. Tag ${record.tagNumber}`, req.user);
      break;
    }
    case 'embalm': {
      await MortuaryRecord.findByIdAndUpdate(booking.mortuary.record, { status: 'embalmed' });
      booking.log('embalmed', note || 'Embalming completed', req.user); // booking stays "admitted"
      break;
    }
    case 'release': {
      const releasedTo = str(req.body.releasedTo, 120);
      const idPresented = str(req.body.idPresented, 120);
      if (!releasedTo || !idPresented) throw new HttpError(400, 'Enter who the body is released to and the ID they presented');
      await MortuaryRecord.findByIdAndUpdate(booking.mortuary.record, {
        status: 'released',
        released: { releasedTo, idPresented, releasedAt: new Date(), authorizedBy: req.user._id },
      });
      booking.status = 'completed';
      booking.log('completed', note || `Released to ${releasedTo}`, req.user);
      break;
    }
    case 'complete': {
      const bd = req.body.burialDate ? new Date(req.body.burialDate) : null;
      if (bd && !Number.isNaN(bd.getTime())) booking.cemetery.burialDate = bd;
      await CemeteryPlot.updateOne({ _id: booking.cemetery.plot }, { $set: { status: 'occupied' } });
      booking.status = 'completed';
      booking.log('completed', note || 'Burial completed', req.user);
      break;
    }
  }

  await booking.save();
  res.json({ success: true, booking: await LedgerEntry.recalc(booking._id) });
});

/* -------------------------------- LEDGER -------------------------------- */
// POST /memorial/manage/bookings/:id/ledger   { type: charge|payment|refund, amount, method, reference, description }
export const addLedgerEntry = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const booking = await loadBooking(req.params.id, org);
  const type = req.body.type;
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  if (!['charge', 'payment', 'refund'].includes(type)) throw new HttpError(400, 'Choose charge, payment or refund');
  if (!(amount > 0)) throw new HttpError(400, 'Enter an amount greater than zero');
  if (type !== 'refund' && !['confirmed', 'admitted', 'completed'].includes(booking.status))
    throw new HttpError(400, 'Confirm the booking before recording charges or payments');
  if (type === 'refund' && amount > booking.amountPaid + 0.009) throw new HttpError(400, 'A refund cannot be more than what has been paid');
  if (type === 'charge') {
    if (!str(req.body.description)) throw new HttpError(400, 'Describe what this charge is for');
    booking.chargesPosted = true;
    await booking.save();
  }

  const entry = await LedgerEntry.create({
    organization: org._id,
    booking: booking._id,
    client: booking.client,
    type,
    amount,
    method: type === 'charge' ? undefined : ['cash', 'transfer', 'pos', 'online', 'other'].includes(req.body.method) ? req.body.method : 'cash',
    reference: str(req.body.reference, 80),
    description: str(req.body.description, 200),
    recordedBy: req.user._id,
  });
  const updated = await LedgerEntry.recalc(booking._id);
  updated.log(updated.status, `${type[0].toUpperCase()}${type.slice(1)} of ₦${amount.toLocaleString()} recorded`, req.user);
  await updated.save();
  res.status(201).json({ success: true, entry, booking: updated });
});

const ledgerFilter = (org, q) => {
  const f = { organization: org._id };
  if (['charge', 'payment', 'refund'].includes(q.type)) f.type = q.type;
  if (q.method) f.method = q.method;
  if (q.from || q.to) {
    f.createdAt = {};
    if (q.from) f.createdAt.$gte = new Date(q.from);
    if (q.to) f.createdAt.$lte = new Date(new Date(q.to).setUTCHours(23, 59, 59, 999));
  }
  return f;
};

// GET /memorial/manage/ledger?type=&method=&from=&to=&page=
export const listLedger = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const { page, limit, skip } = paginate(req.query, 20);
  const filter = ledgerFilter(org, req.query);
  const [items, total, sums] = await Promise.all([
    LedgerEntry.find(filter).populate('booking', 'reference deceased.fullName kind').sort({ createdAt: -1 }).skip(skip).limit(limit),
    LedgerEntry.countDocuments(filter),
    LedgerEntry.aggregate([{ $match: filter }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
  ]);
  const t = (k) => sums.find((s) => s._id === k)?.total || 0;
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit), totals: { charges: t('charge'), payments: t('payment'), refunds: t('refund'), net: t('payment') - t('refund') } });
});

// GET /memorial/manage/ledger/export  -> CSV download
export const exportLedger = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const rows = await LedgerEntry.find(ledgerFilter(org, req.query)).populate('booking', 'reference deceased.fullName').sort({ createdAt: -1 }).limit(5000).lean();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    ['Date', 'Booking', 'Deceased', 'Type', 'Amount', 'Method', 'Reference', 'Description'].join(','),
    ...rows.map((r) => [new Date(r.createdAt).toISOString(), r.booking?.reference, r.booking?.deceased?.fullName, r.type, r.amount, r.method, r.reference, r.description].map(esc).join(',')),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="ledger-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

/* ---------------------- MORTUARY RECORDS (register) --------------------- */
const RECORD_EDIT = ['tagNumber', 'placeOfDeath', 'causeOfDeath', 'certifyingDoctor', 'deathCertificateNumber', 'broughtInBy', 'nextOfKin', 'storage', 'charges', 'paymentStatus', 'status'];

// GET /memorial/manage/records?status=&q=&page=
export const listRecords = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  if (org.type !== 'mortuary') throw new HttpError(400, 'Records are for mortuaries');
  const { page, limit, skip } = paginate(req.query, 15);
  const filter = { mortuary: org._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ tagNumber: rx }, { 'deceased.fullName': rx }, { 'nextOfKin.name': rx }];
  }
  const [items, total] = await Promise.all([
    MortuaryRecord.find(filter).sort({ admittedAt: -1 }).skip(skip).limit(limit).lean(),
    MortuaryRecord.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

// POST /memorial/manage/records   (walk-in admissions that have no online booking)
export const createRecord = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  if (org.type !== 'mortuary') throw new HttpError(400, 'Records are for mortuaries');
  const { deceased = {}, dateOfDeath } = req.body;
  if (!str(deceased.fullName) || !dateOfDeath) throw new HttpError(400, 'Name and date of death are required');
  const record = await MortuaryRecord.create({
    ...pick(req.body, RECORD_EDIT.filter((k) => !['tagNumber', 'status'].includes(k))),
    mortuary: org._id,
    tagNumber: str(req.body.tagNumber, 40) || (await nextTag(org)),
    deceased: pick(deceased, ['fullName', 'gender', 'age', 'dateOfBirth']),
    dateOfDeath,
    handledBy: req.user._id,
  });
  res.status(201).json({ success: true, record });
});

// PATCH /memorial/manage/records/:id
export const updateRecord = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const record = await MortuaryRecord.findOneAndUpdate(
    { _id: req.params.id, mortuary: org._id },
    { $set: pick(req.body, RECORD_EDIT) },
    { new: true, runValidators: true }
  );
  if (!record) throw new HttpError(404, 'Record not found');
  res.json({ success: true, record });
});

/* ----------------------------- CEMETERY PLOTS --------------------------- */
const requireCemetery = async (req) => {
  const org = await getMyOrg(req);
  if (org.type !== 'cemetery') throw new HttpError(400, 'Plots are for cemeteries');
  return org;
};
const PLOT_TYPES = ['single', 'double', 'family', 'vault'];

// GET /memorial/manage/plots?status=&section=&type=
export const listPlots = wrap(async (req, res) => {
  const org = await requireCemetery(req);
  const filter = { cemetery: org._id, ...pick(req.query, ['status', 'section', 'type']) };
  const plots = await CemeteryPlot.find(filter).collation({ locale: 'en', numericOrdering: true }).sort({ section: 1, plotNumber: 1 }).limit(1000).lean();
  res.json({ success: true, plots, sections: [...new Set(plots.map((p) => p.section).filter(Boolean))] });
});

// POST /memorial/manage/plots   { section, plotNumber, type, price }
export const createPlot = wrap(async (req, res) => {
  const org = await requireCemetery(req);
  if (!str(req.body.plotNumber)) throw new HttpError(400, 'Enter a plot number');
  const plot = await CemeteryPlot.create({
    cemetery: org._id,
    section: str(req.body.section, 60),
    plotNumber: str(req.body.plotNumber, 30),
    type: PLOT_TYPES.includes(req.body.type) ? req.body.type : 'single',
    price: num(req.body.price),
  });
  res.status(201).json({ success: true, plot });
});

// POST /memorial/manage/plots/bulk   { section, prefix, from, to, type, price }  (max 500 at once)
export const bulkCreatePlots = wrap(async (req, res) => {
  const org = await requireCemetery(req);
  const from = parseInt(req.body.from);
  const to = parseInt(req.body.to);
  if (!(from >= 0) || !(to >= from) || to - from >= 500) throw new HttpError(400, 'Choose a range of up to 500 plots');
  const prefix = str(req.body.prefix, 10) || '';
  const docs = Array.from({ length: to - from + 1 }, (_, i) => ({
    cemetery: org._id,
    section: str(req.body.section, 60),
    plotNumber: `${prefix}${from + i}`,
    type: PLOT_TYPES.includes(req.body.type) ? req.body.type : 'single',
    price: num(req.body.price),
  }));
  let created = 0;
  try {
    created = (await CemeteryPlot.insertMany(docs, { ordered: false })).length;
  } catch (err) {
    if (err.code !== 11000 && !err.writeErrors) throw err;
    created = err.insertedDocs?.length ?? docs.length - (err.writeErrors?.length || 0);
  }
  res.status(201).json({ success: true, created, skipped: docs.length - created });
});

// PATCH /memorial/manage/plots/:id   { section, plotNumber, type, price, status }
export const updatePlot = wrap(async (req, res) => {
  const org = await requireCemetery(req);
  const plot = await CemeteryPlot.findOne({ _id: req.params.id, cemetery: org._id });
  if (!plot) throw new HttpError(404, 'Plot not found');
  const patch = pick(req.body, ['section', 'plotNumber', 'type', 'price']);
  if (req.body.status && req.body.status !== plot.status) {
    if (plot.booking && plot.status === 'reserved') throw new HttpError(409, 'This plot belongs to an open booking. Manage it from Bookings.');
    if (!['available', 'reserved', 'occupied'].includes(req.body.status)) throw new HttpError(400, 'Invalid status');
    patch.status = req.body.status;
    if (patch.status === 'available') {
      plot.reservedBy = undefined;
      plot.booking = undefined;
    }
  }
  plot.set(patch);
  await plot.save();
  res.json({ success: true, plot });
});

// DELETE /memorial/manage/plots/:id  (only plots nobody has touched)
export const deletePlot = wrap(async (req, res) => {
  const org = await requireCemetery(req);
  const plot = await CemeteryPlot.findOneAndDelete({ _id: req.params.id, cemetery: org._id, status: 'available' });
  if (!plot) throw new HttpError(409, 'Only available plots can be removed');
  res.json({ success: true });
});

/* ------------------------------- SETTINGS ------------------------------- */
// PATCH /memorial/manage/settings
// body: { about, openingHours, is24Hours, phone, email, memorial{capacity, storageRatePerDay, bookingsOpen, cancellationPolicy, amenities[], services[{_id?,name,description,price}]} }
// (address + geocoding stay on your existing PATCH /providers/me/settings)
export const updateSettings = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const b = req.body;
  const set = {};
  if (b.about !== undefined) set.about = String(b.about).slice(0, 1000);
  if (b.openingHours !== undefined) set.openingHours = str(b.openingHours, 80);
  if (b.is24Hours !== undefined) set.is24Hours = !!b.is24Hours;
  if (b.phone !== undefined) set.phone = str(b.phone, 30);
  if (b.email !== undefined) set.email = str(b.email, 120)?.toLowerCase();

  const m = b.memorial || {};
  if (m.capacity !== undefined) set['memorial.capacity'] = Math.floor(num(m.capacity));
  if (m.storageRatePerDay !== undefined) set['memorial.storageRatePerDay'] = num(m.storageRatePerDay);
  if (m.bookingsOpen !== undefined) set['memorial.bookingsOpen'] = !!m.bookingsOpen;
  if (m.cancellationPolicy !== undefined) set['memorial.cancellationPolicy'] = str(m.cancellationPolicy, 600) || '';
  if (Array.isArray(m.amenities)) set['memorial.amenities'] = m.amenities.map((a) => str(a, 60)).filter(Boolean).slice(0, 20);
  if (Array.isArray(m.services))
    set['memorial.services'] = m.services
      .filter((s) => str(s?.name))
      .slice(0, 30)
      .map((s) => ({
        ...(mongoose.isValidObjectId(s._id) ? { _id: s._id } : {}),
        name: str(s.name, 80),
        description: str(s.description, 240),
        price: num(s.price),
      }));

  const updated = await Organization.findByIdAndUpdate(org._id, { $set: set }, { new: true, runValidators: true });
  res.json({ success: true, org: updated });
});

// GET /memorial/manage/settings
export const getSettings = wrap(async (req, res) => {
  res.json({ success: true, org: await getMyOrg(req) });
});

/* -------------------------------- REVIEWS ------------------------------- */
// GET /memorial/manage/reviews?page=
export const listOrgReviews = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const { page, limit, skip } = paginate(req.query, 10);
  const filter = { targetType: 'Organization', target: org._id };
  const [items, total] = await Promise.all([
    Review.find(filter).populate('reviewer', 'fullName').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) });
});

// POST /memorial/manage/reviews/:id/reply   { text }
export const replyToReview = wrap(async (req, res) => {
  const org = await getMyOrg(req);
  const text = str(req.body.text, 800);
  if (!text) throw new HttpError(400, 'Write a reply first');
  const review = await Review.findOneAndUpdate(
    { _id: req.params.id, targetType: 'Organization', target: org._id },
    { $set: { reply: { text, repliedBy: req.user._id, repliedAt: new Date() } } },
    { new: true }
  );
  if (!review) throw new HttpError(404, 'Review not found');
  res.json({ success: true, review });
});
