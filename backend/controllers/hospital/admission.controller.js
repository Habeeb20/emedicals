import Admission from '../../models/hospital/Admission.js';
import PatientRecord from '../../models/hospital/PatientRecord.js';
import { Bed } from '../../models/hospital/Ward.js';
import { addCharge } from '../../services/billing.service.js';
import { broadcast, tellPatient } from '../../services/hospitalRealtime.js';
import { pickVitals } from '../../utils/vitals.js';
import { ok, fail, HttpError } from '../../utils/http.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const LIST_POPULATE = [
  { path: 'patient', select: 'fullName mrn gender dateOfBirth allergies bloodGroup' },
  { path: 'doctor', select: 'fullName' },
  { path: 'bed', select: 'label' },
  { path: 'ward', select: 'name type dailyRate' },
];

const findAdmission = async (req, { mustBeOpen = false } = {}) => {
  const admission = await Admission.findOne({ _id: req.params.id, organization: req.orgId });
  if (!admission) throw new HttpError(404, 'Admission not found');
  if (mustBeOpen && admission.status !== 'admitted') throw new HttpError(409, 'This patient has already been discharged');
  return admission;
};

const patientOf = (admission) => PatientRecord.findById(admission.patient).select('user fullName');

const announce = (admission, action, patient) => {
  broadcast(admission.organization, 'hospital:admission', { action, id: admission._id }, patient?.user);
};

// Takes a bed in ONE atomic step. If two nurses pick the same bed, only the first one gets it.
const claimBed = async (bedId, orgId) => {
  const bed = await Bed.findOneAndUpdate(
    { _id: bedId, organization: orgId, status: 'available' },
    { status: 'occupied' },
    { new: true }
  ).populate('ward');
  if (!bed) throw new HttpError(409, 'That bed is not available');
  return bed;
};

const releaseBed = (bedId) => Bed.updateOne({ _id: bedId }, { status: 'available', admission: null });

const openStay = (bed) => ({
  bed: bed._id,
  bedLabel: bed.label,
  wardName: bed.ward.name,
  dailyRate: bed.ward.dailyRate, // the rate is copied now, so later price changes do not alter this stay
  from: new Date(),
});

const closeLastStay = (admission, when) => {
  const stay = admission.stays[admission.stays.length - 1];
  if (stay && !stay.to) stay.to = when;
};

// A part day counts as a full day, and every stay is at least one day
const daysBetween = (from, to) => Math.max(1, Math.ceil((to - from) / DAY_MS));

// GET /hospital/admissions?status=admitted|discharged|all
export const listAdmissions = async (req, res) => {
  try {
    const filter = { organization: req.orgId };
    const status = req.query.status || 'admitted';
    if (status !== 'all') filter.status = status;

    const admissions = await Admission.find(filter)
      .populate(LIST_POPULATE)
      .select('-notes -vitals')
      .sort({ admittedAt: -1 })
      .limit(200)
      .lean();
    return ok(res, admissions);
  } catch (error) {
    return fail(res, error, 'Could not load admissions');
  }
};

// GET /hospital/admissions/:id
export const getAdmission = async (req, res) => {
  try {
    const admission = await Admission.findOne({ _id: req.params.id, organization: req.orgId })
      .populate([...LIST_POPULATE, { path: 'notes.author', select: 'fullName role' }, { path: 'vitals.recordedBy', select: 'fullName' }])
      .lean();
    if (!admission) throw new HttpError(404, 'Admission not found');
    return ok(res, admission);
  } catch (error) {
    return fail(res, error, 'Could not load the admission');
  }
};

// POST /hospital/admissions  { patientId, bedId, reason, visitId? }
export const admitPatient = async (req, res) => {
  try {
    const { patientId, bedId, reason, visitId } = req.body;
    if (!reason?.trim()) throw new HttpError(400, 'Give a reason for admission');

    const patient = await PatientRecord.findOne({ _id: patientId, organization: req.orgId });
    if (!patient) throw new HttpError(404, 'Patient not found');
    if (await Admission.exists({ organization: req.orgId, patient: patient._id, status: 'admitted' })) {
      throw new HttpError(409, 'This patient is already admitted');
    }

    const bed = await claimBed(bedId, req.orgId);
    try {
      const admission = await Admission.create({
        organization: req.orgId,
        patient: patient._id,
        doctor: req.user.role === 'doctor' ? req.user._id : undefined,
        admittedBy: req.user._id,
        visit: visitId || undefined,
        bed: bed._id,
        ward: bed.ward._id,
        reason: reason.trim(),
        stays: [openStay(bed)],
      });
      await Bed.updateOne({ _id: bed._id }, { admission: admission._id });

      broadcast(req.orgId, 'hospital:bed', { action: 'admitted' });
      announce(admission, 'admitted', patient);
      await tellPatient(patient, 'You have been admitted', `You are in ${bed.ward.name}, bed ${bed.label}.`, { admissionId: admission._id });
      return ok(res, admission, 201);
    } catch (error) {
      await releaseBed(bed._id); // do not leave the bed locked if saving the admission failed
      throw error;
    }
  } catch (error) {
    return fail(res, error, 'Could not admit the patient');
  }
};

// POST /hospital/admissions/:id/vitals
export const addVitals = async (req, res) => {
  try {
    const admission = await findAdmission(req, { mustBeOpen: true });
    admission.vitals.push(pickVitals(req.body, req.user._id));
    await admission.save();
    announce(admission, 'vitals', await patientOf(admission));
    return ok(res, admission);
  } catch (error) {
    return fail(res, error, 'Could not save the vitals');
  }
};

// POST /hospital/admissions/:id/notes  { text }
export const addNote = async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) throw new HttpError(400, 'Write a note first');

    const admission = await findAdmission(req, { mustBeOpen: true });
    admission.notes.push({ kind: req.user.role === 'doctor' ? 'doctor' : 'nursing', text, author: req.user._id });
    await admission.save();
    announce(admission, 'note', null); // notes are for staff, so the patient is not pinged
    return ok(res, admission);
  } catch (error) {
    return fail(res, error, 'Could not save the note');
  }
};

// POST /hospital/admissions/:id/transfer  { bedId }
export const transferBed = async (req, res) => {
  try {
    const admission = await findAdmission(req, { mustBeOpen: true });
    if (String(admission.bed) === String(req.body.bedId)) throw new HttpError(400, 'The patient is already in that bed');

    const newBed = await claimBed(req.body.bedId, req.orgId);
    try {
      const oldBed = await Bed.findById(admission.bed).populate('ward', 'name');
      closeLastStay(admission, new Date());
      admission.stays.push(openStay(newBed));
      admission.bed = newBed._id;
      admission.ward = newBed.ward._id;
      admission.notes.push({
        kind: 'nursing',
        text: `Moved from ${oldBed?.ward?.name} ${oldBed?.label} to ${newBed.ward.name} ${newBed.label}.`,
        author: req.user._id,
      });
      await admission.save();
      await Bed.updateOne({ _id: newBed._id }, { admission: admission._id });
      if (oldBed) await releaseBed(oldBed._id);
    } catch (error) {
      await releaseBed(newBed._id);
      throw error;
    }

    const patient = await patientOf(admission);
    broadcast(req.orgId, 'hospital:bed', { action: 'transferred' });
    announce(admission, 'transferred', patient);
    await tellPatient(patient, 'You have been moved', `Your new bed is ${newBed.label} in ${newBed.ward.name}.`, { admissionId: admission._id });
    return ok(res, admission);
  } catch (error) {
    return fail(res, error, 'Could not move the patient');
  }
};

// POST /hospital/admissions/:id/discharge  { dischargeSummary, dischargeInstructions?, followUpDate? }
export const dischargePatient = async (req, res) => {
  try {
    const summary = String(req.body.dischargeSummary || '').trim();
    if (!summary) throw new HttpError(400, 'Write a discharge summary');

    const admission = await findAdmission(req, { mustBeOpen: true });
    const now = new Date();

    closeLastStay(admission, now);
    admission.status = 'discharged';
    admission.dischargedAt = now;
    admission.dischargeSummary = summary;
    admission.dischargeInstructions = String(req.body.dischargeInstructions || '').trim();
    admission.followUpDate = req.body.followUpDate || undefined;
    await admission.save();

    await releaseBed(admission.bed);

    // Bill the stay: one line per bed the patient used
    const patient = await patientOf(admission);
    const items = admission.stays
      .filter((stay) => stay.dailyRate > 0)
      .map((stay) => {
        const days = daysBetween(stay.from, stay.to);
        return { description: `Bed ${stay.bedLabel} (${stay.wardName}), ${days} day(s)`, category: 'bed', quantity: days, unitPrice: stay.dailyRate };
      });
    if (items.length) await addCharge({ organization: req.orgId, patient, items, userId: req.user._id });

    broadcast(req.orgId, 'hospital:bed', { action: 'discharged' });
    announce(admission, 'discharged', patient);
    await tellPatient(patient, 'You have been discharged', 'Your discharge summary is now in your medical records.', { admissionId: admission._id });
    return ok(res, admission);
  } catch (error) {
    return fail(res, error, 'Could not discharge the patient');
  }
};