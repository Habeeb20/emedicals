import Visit from '../../models/hospital/Visit.js';
import PatientRecord from '../../models/hospital/PatientRecord.js';
import Organization from '../../models/Organization.js';
import { nextNumber } from '../../models/hospital/Counter.js';
import { addCharge } from '../../services/billing.service.js';
import { broadcast, tellPatient } from '../../services/hospitalRealtime.js';
import { pickVitals } from '../../utils/vitals.js';
import { startOfToday } from '../../utils/dates.js';
import { ok, fail, HttpError } from '../../utils/http.js';

const OPEN_STATUSES = ['waiting', 'triaged', 'in_consultation'];
const QUEUE_RANK = { emergency: 0, urgent: 1, normal: 2 };
const CLINICAL_FIELDS = ['history', 'examination', 'diagnosis', 'treatmentPlan', 'notes'];

const findVisit = async (req) => {
  const visit = await Visit.findOne({ _id: req.params.id, organization: req.orgId });
  if (!visit) throw new HttpError(404, 'Visit not found');
  return visit;
};

const patientOf = (visit) => PatientRecord.findById(visit.patient).select('user fullName');

// Tell every screen at this hospital (and the patient, if they have an account) that the queue changed
const announce = (visit, action, patient) =>
  broadcast(visit.organization, 'hospital:visit', { action, id: visit._id }, patient?.user);

// POST /hospital/visits: a patient arrives and joins the queue
export const createVisit = async (req, res) => {
  try {
    const { patientId, complaint, priority = 'normal', type = 'opd' } = req.body;
    if (!complaint?.trim()) throw new HttpError(400, 'Say what the patient is here for');
    if (!(priority in QUEUE_RANK)) throw new HttpError(400, 'Priority must be normal, urgent or emergency');

    const patient = await PatientRecord.findOne({ _id: patientId, organization: req.orgId });
    if (!patient) throw new HttpError(404, 'Patient not found');

    const alreadyOpen = await Visit.exists({ organization: req.orgId, patient: patient._id, status: { $in: OPEN_STATUSES } });
    if (alreadyOpen) throw new HttpError(409, 'This patient already has an open visit');

    const visit = await Visit.create({
      organization: req.orgId,
      patient: patient._id,
      visitNumber: await nextNumber(`visit:${req.orgId}`, 'V'),
      complaint: complaint.trim(),
      priority,
      type,
      queueRank: QUEUE_RANK[priority],
      createdBy: req.user._id,
    });

    announce(visit, 'created', patient);
    await tellPatient(patient, 'You are in the queue', `Your visit ${visit.visitNumber} has been registered.`, { visitId: visit._id });
    return ok(res, visit, 201);
  } catch (error) {
    return fail(res, error, 'Could not start the visit');
  }
};

// GET /hospital/visits: everyone still in the queue, plus everything that happened today
export const listVisits = async (req, res) => {
  try {
    const visits = await Visit.find({
      organization: req.orgId,
      $or: [{ status: { $in: OPEN_STATUSES } }, { createdAt: { $gte: startOfToday() } }],
    })
      .populate('patient', 'fullName mrn gender dateOfBirth allergies bloodGroup')
      .populate('doctor', 'fullName')
      .sort({ queueRank: 1, createdAt: 1 })
      .limit(200)
      .lean();
    return ok(res, visits);
  } catch (error) {
    return fail(res, error, 'Could not load visits');
  }
};

// POST /hospital/visits/:id/vitals: nurse (or doctor) records triage readings
export const recordVitals = async (req, res) => {
  try {
    const visit = await findVisit(req);
    if (!OPEN_STATUSES.includes(visit.status)) throw new HttpError(409, 'This visit is already closed');

    visit.vitals = pickVitals(req.body, req.user._id);
    if (visit.status === 'waiting') visit.status = 'triaged';
    await visit.save();

    announce(visit, 'vitals', await patientOf(visit));
    return ok(res, visit);
  } catch (error) {
    return fail(res, error, 'Could not save the vitals');
  }
};

// POST /hospital/visits/:id/start: a doctor takes the patient in
export const startConsultation = async (req, res) => {
  try {
    // One atomic update: if two doctors click at once, only one of them wins
    const visit = await Visit.findOneAndUpdate(
      { _id: req.params.id, organization: req.orgId, status: { $in: ['waiting', 'triaged'] } },
      { status: 'in_consultation', doctor: req.user._id, startedAt: new Date() },
      { new: true }
    );
    if (!visit) throw new HttpError(409, 'This patient is no longer waiting');

    const patient = await patientOf(visit);
    announce(visit, 'started', patient);
    await tellPatient(patient, 'Your consultation has started', `Dr ${req.user.fullName} is seeing you now.`, { visitId: visit._id });
    return ok(res, visit);
  } catch (error) {
    return fail(res, error, 'Could not start the consultation');
  }
};

// PATCH /hospital/visits/:id: the doctor saves notes. Send { complete: true } to finish the visit.
export const saveConsultation = async (req, res) => {
  try {
    const visit = await findVisit(req);
    if (visit.status !== 'in_consultation') throw new HttpError(409, 'This visit is not in consultation');
    if (String(visit.doctor) !== String(req.user._id)) {
      throw new HttpError(403, 'Only the doctor handling this visit can change it');
    }

    CLINICAL_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) visit[field] = String(req.body[field]).trim();
    });
    if (req.body.followUpDate !== undefined) visit.followUpDate = req.body.followUpDate || undefined;

    let fee = 0;
    if (req.body.complete) {
      if (!visit.diagnosis) throw new HttpError(400, 'Add a diagnosis before completing the visit');

      // Fee: what the doctor typed, otherwise the hospital's default appointment fee
      if (req.body.fee !== undefined && req.body.fee !== '') {
        fee = Number(req.body.fee);
        if (Number.isNaN(fee) || fee < 0) throw new HttpError(400, 'Fee must be a positive number');
      } else {
        const org = await Organization.findById(req.orgId).select('paymentSettings');
        fee = org?.paymentSettings?.appointmentFee || 0;
      }

      visit.status = 'completed';
      visit.completedAt = new Date();
    }

    await visit.save();
    const patient = await patientOf(visit);

    if (req.body.complete) {
      if (fee > 0) {
        await addCharge({
          organization: req.orgId,
          patient,
          userId: req.user._id,
          items: [{ description: `Consultation (${visit.visitNumber})`, category: 'consultation', quantity: 1, unitPrice: fee }],
        });
      }
      await tellPatient(patient, 'Your visit is complete', 'Your visit notes are now in your medical records.', { visitId: visit._id });
    }

    announce(visit, req.body.complete ? 'completed' : 'saved', patient);
    return ok(res, visit);
  } catch (error) {
    return fail(res, error, 'Could not save the consultation');
  }
};

// POST /hospital/visits/:id/cancel
export const cancelVisit = async (req, res) => {
  try {
    const visit = await findVisit(req);
    if (!OPEN_STATUSES.includes(visit.status)) throw new HttpError(409, 'This visit is already closed');

    visit.status = 'cancelled';
    await visit.save();
    announce(visit, 'cancelled', await patientOf(visit));
    return ok(res, visit);
  } catch (error) {
    return fail(res, error, 'Could not cancel the visit');
  }
};