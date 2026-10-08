import crypto from 'crypto';
import Prescription from '../models/Prescription.js';
import User from '../models/User.js';
import { asyncHandler, AppError, rx as toRegex } from '../utils/helpers.js';
import { notify } from '../services/notify.service.js';

const genCode = () => `RX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/** Used by the appointment flow; also callable from a standalone "write prescription" endpoint */
export async function createPrescription({ appt, doctorId, items, purpose }) {
  const clean = items.map((i) => ({
    medicine: String(i.medicine || '').trim(), dosage: i.dosage, frequency: i.frequency,
    duration: i.duration, instructions: i.instructions, quantity: i.quantity,
    purpose: i.purpose || purpose,                         // what the drug is for
  })).filter((i) => i.medicine);
  if (!clean.length) throw new AppError('Add at least one drug');

  let doc;
  for (let tries = 0; tries < 5 && !doc; tries++) {
    try {
      doc = await Prescription.create({
        patient: appt.patient, doctor: doctorId, organization: appt.organization, appointment: appt._id,
        purpose, items: clean, code: genCode(),
      });
    } catch (e) { if (e.code !== 11000) throw e; }          // retry on duplicate code
  }
  await notify(appt.patient, {
    type: 'prescription:issued', title: 'New prescription',
    body: `You have a new prescription (code ${doc.code}) with ${clean.length} item(s).`, data: { prescriptionId: doc._id },
  });
  return doc;
}

/** GET /prescriptions/mine (patient) */
export const myPrescriptions = asyncHandler(async (req, res) => {
  const list = await Prescription.find({ patient: req.user._id }).sort('-createdAt')
    .populate('doctor', 'fullName').populate('organization', 'name').lean();
  res.json({ status: 'success', data: list, meta: { total: list.length, isPublic: !!req.user.prescriptionPublic } });
});

/** PATCH /prescriptions/visibility { isPublic } (patient) */
export const setVisibility = asyncHandler(async (req, res) => {
  if (typeof req.body.isPublic !== 'boolean') throw new AppError('isPublic must be true or false');
  await User.updateOne({ _id: req.user._id }, { prescriptionPublic: req.body.isPublic });
  res.json({ status: 'success', data: { isPublic: req.body.isPublic } });
});

const shape = (p) => ({
  id: p._id, code: p.code, status: p.status, issuedAt: p.createdAt, purpose: p.purpose,
  patient: p.patient && { id: p.patient._id, name: p.patient.fullName, gender: p.patient.gender, dateOfBirth: p.patient.dateOfBirth },
  prescribedBy: p.doctor?.fullName, hospital: p.organization?.name,
  items: p.items, dispensedAt: p.dispensedAt,
});

/**
 * GET /prescriptions/search?q=  (pharmacist)
 *  - exact code (RX-XXXXXX): always works — handing the code over is the patient's consent
 *  - patient name or drug name: only prescriptions of patients who switched visibility ON
 */
export const searchPrescriptions = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) throw new AppError('Type at least 2 characters');

  const populate = (query) => query.populate('patient', 'fullName gender dateOfBirth').populate('doctor', 'fullName').populate('organization', 'name');

  if (/^RX-[0-9A-F]{6}$/i.test(q)) {
    const byCode = await populate(Prescription.find({ code: q.toUpperCase() }));
    return res.json({ status: 'success', data: byCode.map(shape), meta: { total: byCode.length, via: 'code' } });
  }

  const rx = toRegex(q);
  const nameIds = await Prescription.distinct('_id', {
    patient: { $in: await User.find({ role: 'patient', prescriptionPublic: true, fullName: rx }).distinct('_id') },
  });
  const drugIds = (await Prescription.aggregate([
    { $match: { 'items.medicine': rx } },
    { $lookup: { from: 'users', localField: 'patient', foreignField: '_id', as: 'p' } },
    { $match: { 'p.prescriptionPublic': true } },
    { $project: { _id: 1 } }, { $limit: 200 },
  ])).map((d) => d._id);

  const list = await populate(Prescription.find({ _id: { $in: [...nameIds, ...drugIds] } }).sort('-createdAt').limit(100));
  res.json({ status: 'success', data: list.map(shape), meta: { total: list.length, via: 'search' } });
});

/** PATCH /prescriptions/:id/dispense { status: 'dispensed' | 'partially_dispensed' } (pharmacist) */
export const dispense = asyncHandler(async (req, res) => {
  const status = req.body.status || 'dispensed';
  if (!['dispensed', 'partially_dispensed'].includes(status)) throw new AppError('Invalid status');
  const p = await Prescription.findById(req.params.id).populate('patient', 'prescriptionPublic');
  if (!p) throw new AppError('Prescription not found', 404);
  if (['dispensed', 'cancelled'].includes(p.status)) throw new AppError(`Prescription already ${p.status}`, 409);
  // pharmacist must have found it via code or public visibility; re-check visibility here
  if (!p.patient.prescriptionPublic && req.body.code !== p.code) throw new AppError('Provide the prescription code', 403);
  Object.assign(p, { status, dispensedBy: req.user._id, pharmacy: req.user.organization, dispensedAt: new Date() });
  await p.save();
  await notify(p.patient._id, { type: 'prescription:dispensed', title: 'Prescription dispensed', body: `Your prescription ${p.code} was ${status.replace('_', ' ')}.`, data: { prescriptionId: p._id } });
  res.json({ status: 'success', data: p });
});
