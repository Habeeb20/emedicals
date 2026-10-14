import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import CemeteryPlot from '../models/CemeteryPlot.js';
import MemorialBooking from '../models/MemorialBooking.js';
import LedgerEntry from '../models/LedgerEntry.js';
import { MEMORIAL_TYPES, wrap, HttpError, paginate, isOrgManager, mortuaryOccupancy } from './memorialHelpers.js';

const clean = (v, max = 200) => (v == null ? undefined : String(v).trim().slice(0, max) || undefined);
const toDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : undefined;
};

const releasePlot = (plotId) =>
  plotId &&
  CemeteryPlot.updateOne(
    { _id: plotId, status: 'reserved' },
    { $set: { status: 'available' }, $unset: { reservedBy: '', booking: '' } }
  );

/* POST /memorial/bookings
   body: { organizationId, plotId?, deceased{}, contact{}, mortuary{expectedAdmission,expectedDays,transportRequired,pickupAddress},
           cemetery{burialDate,burialTime}, serviceIds[], notes }
   Prices are always computed on the server from the facility's own price list. */
export const createBooking = wrap(async (req, res) => {
  const { organizationId, plotId, deceased = {}, contact = {}, serviceIds = [], notes } = req.body;
  const m = req.body.mortuary || {};
  const c = req.body.cemetery || {};

  if (!mongoose.isValidObjectId(organizationId)) throw new HttpError(400, 'Choose a facility to book');
  const org = await Organization.findOne({ _id: organizationId, status: 'approved', type: { $in: MEMORIAL_TYPES } });
  if (!org) throw new HttpError(404, 'Facility not found');
  if (org.memorial?.bookingsOpen === false) throw new HttpError(400, 'This facility is not taking online bookings right now');
  if (String(org.owner) === String(req.user._id)) throw new HttpError(403, 'You cannot book your own facility');

  if (!clean(deceased.fullName)) throw new HttpError(400, "Enter the deceased person's full name");
  if (!clean(contact.name) || !clean(contact.phone)) throw new HttpError(400, 'Enter a contact name and phone number');

  const wanted = new Set((Array.isArray(serviceIds) ? serviceIds : []).map(String));
  const services = (org.memorial?.services || []).filter((s) => wanted.has(String(s._id)));
  const quoteLines = [];

  const booking = new MemorialBooking({
    kind: org.type,
    organization: org._id,
    client: req.user._id,
    deceased: {
      fullName: clean(deceased.fullName),
      gender: ['male', 'female', 'other'].includes(deceased.gender) ? deceased.gender : undefined,
      age: Number.isFinite(+deceased.age) && deceased.age !== '' ? +deceased.age : undefined,
      dateOfBirth: toDate(deceased.dateOfBirth),
      dateOfDeath: toDate(deceased.dateOfDeath),
      placeOfDeath: clean(deceased.placeOfDeath),
      causeOfDeath: clean(deceased.causeOfDeath),
    },
    contact: {
      name: clean(contact.name),
      phone: clean(contact.phone, 30),
      email: clean(contact.email),
      relationship: clean(contact.relationship, 60),
      address: clean(contact.address, 300),
    },
    services: services.map((s) => ({ name: s.name, price: s.price || 0 })),
    notes: clean(notes, 1000),
  });

  let reservedPlotId = null;

  if (org.type === 'mortuary') {
    if (!booking.deceased.dateOfDeath) throw new HttpError(400, 'Enter the date of death');
    const occ = await mortuaryOccupancy(org);
    if (occ.capacity && occ.available <= 0) throw new HttpError(409, 'This mortuary has no free space right now. Try another facility.');

    const days = Math.min(Math.max(parseInt(m.expectedDays) || 1, 1), 90);
    booking.mortuary = {
      expectedAdmission: toDate(m.expectedAdmission),
      expectedDays: days,
      transportRequired: !!m.transportRequired,
      pickupAddress: clean(m.pickupAddress, 300),
    };
    const rate = org.memorial?.storageRatePerDay || 0;
    if (rate) quoteLines.push({ label: `Storage for ${days} day${days > 1 ? 's' : ''}`, amount: rate * days });
  } else {
    if (!mongoose.isValidObjectId(plotId)) throw new HttpError(400, 'Choose a plot to reserve');
    // atomic: only one family can take a plot
    const plot = await CemeteryPlot.findOneAndUpdate(
      { _id: plotId, cemetery: org._id, status: 'available' },
      { $set: { status: 'reserved', reservedBy: { name: booking.contact.name, phone: booking.contact.phone } } },
      { new: true }
    );
    if (!plot) throw new HttpError(409, 'That plot was just taken. Please choose another.');
    reservedPlotId = plot._id;
    booking.cemetery = { plot: plot._id, burialDate: toDate(c.burialDate), burialTime: clean(c.burialTime, 20) };
    quoteLines.push({ label: `Plot ${plot.plotNumber}${plot.section ? ` (${plot.section})` : ''}`, amount: plot.price || 0 });
  }

  services.forEach((s) => quoteLines.push({ label: s.name, amount: s.price || 0 }));
  booking.quoteLines = quoteLines;
  booking.quote = quoteLines.reduce((a, l) => a + l.amount, 0);
  booking.log('pending', 'Booking request submitted', req.user);

  try {
    await booking.save();
  } catch (err) {
    await releasePlot(reservedPlotId);
    throw err;
  }
  if (reservedPlotId) await CemeteryPlot.updateOne({ _id: reservedPlotId }, { $set: { booking: booking._id } });

  res.status(201).json({ success: true, booking });
});

/* GET /memorial/bookings?status=&kind=&page= : the client's own history */
export const listMyBookings = wrap(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, 10);
  const filter = { client: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.kind) filter.kind = req.query.kind;

  const [items, total, sums] = await Promise.all([
    MemorialBooking.find(filter)
      .populate('organization', 'name type address phone logo')
      .populate('cemetery.plot', 'plotNumber section type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    MemorialBooking.countDocuments(filter),
    MemorialBooking.aggregate([
      { $match: { client: req.user._id } },
      { $group: { _id: null, bookings: { $sum: 1 }, paid: { $sum: '$amountPaid' }, charges: { $sum: '$charges' } } },
    ]),
  ]);
  const s = sums[0] || { bookings: 0, paid: 0, charges: 0 };
  res.json({
    success: true,
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: { bookings: s.bookings, totalPaid: s.paid, outstanding: Math.max(s.charges - s.paid, 0) },
  });
});

/* GET /memorial/bookings/:id : booking, timeline and statement. Client or the facility's own officer. */
export const getBooking = wrap(async (req, res) => {
  const booking = await MemorialBooking.findById(req.params.id)
    .populate('organization', 'name type address phone email logo owner memorial.cancellationPolicy')
    .populate('cemetery.plot', 'plotNumber section type price')
    .populate('history.by', 'fullName');
  if (!booking) throw new HttpError(404, 'Booking not found');

  const isClient = String(booking.client) === String(req.user._id);
  if (!isClient && !isOrgManager(req.user, booking.organization)) throw new HttpError(403, 'Not allowed');

  const ledger = await LedgerEntry.find({ booking: booking._id }).sort({ createdAt: 1 }).populate('recordedBy', 'fullName');
  const obj = booking.toJSON();
  if (obj.organization) delete obj.organization.owner;
  res.json({ success: true, booking: obj, ledger });
});

/* POST /memorial/bookings/:id/cancel   { reason } */
export const cancelMyBooking = wrap(async (req, res) => {
  const booking = await MemorialBooking.findOne({ _id: req.params.id, client: req.user._id });
  if (!booking) throw new HttpError(404, 'Booking not found');
  if (!['pending', 'confirmed'].includes(booking.status))
    throw new HttpError(400, 'Only pending or confirmed bookings can be cancelled. Please contact the facility.');

  const hadPaid = booking.amountPaid > 0;
  booking.status = 'cancelled';
  booking.log('cancelled', clean(req.body.reason, 300) || 'Cancelled by client', req.user);
  if (hadPaid) booking.log('cancelled', 'Payment on record. The facility will arrange any refund.', req.user);
  await booking.save();

  if (booking.kind === 'cemetery') await releasePlot(booking.cemetery?.plot);
  res.json({
    success: true,
    booking,
    message: hadPaid ? 'Booking cancelled. The facility will contact you about your refund.' : 'Booking cancelled.',
  });
});
