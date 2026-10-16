import PatientRecord from '../../models/hospital/PatientRecord.js';
import Visit from '../../models/hospital/Visit.js';
import Admission from '../../models/hospital/Admission.js';
import Invoice from '../../models/hospital/Invoice.js';
import { broadcast } from '../../services/hospitalRealtime.js';
import { ok, fail, HttpError } from '../../utils/http.js';

// Patient-side routes. A patient only ever sees records linked to their own account.
const myRecordIds = async (userId) => (await PatientRecord.find({ user: userId }).select('_id').lean()).map((r) => r._id);

// GET /hospital/my-records: finished visits and admissions at every hospital that registered them
export const getMyRecords = async (req, res) => {
  try {
    const ids = await myRecordIds(req.user._id);

    const [visits, admissions] = await Promise.all([
      Visit.find({ patient: { $in: ids }, status: 'completed' })
        .populate('organization', 'name')
        .populate('doctor', 'fullName')
        .select('-createdBy')
        .sort({ completedAt: -1 })
        .limit(100)
        .lean(),
      Admission.find({ patient: { $in: ids } })
        .populate('organization', 'name')
        .populate('doctor', 'fullName')
        .populate('ward', 'name')
        .select('-notes -vitals -stays')
        .sort({ admittedAt: -1 })
        .limit(50)
        .lean(),
    ]);

    return ok(res, { visits, admissions });
  } catch (error) {
    return fail(res, error, 'Could not load your records');
  }
};

// GET /hospital/my-invoices
export const getMyInvoices = async (req, res) => {
  try {
    const ids = await myRecordIds(req.user._id);
    const invoices = await Invoice.find({ patient: { $in: ids }, status: { $ne: 'void' } })
      .populate('organization', 'name')
      .select('-voidReason')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return ok(res, invoices);
  } catch (error) {
    return fail(res, error, 'Could not load your bills');
  }
};

// GET /hospital/my-hospitals: every hospital this patient is registered at, with what is happening there now
export const getMyHospitals = async (req, res) => {
  try {
    const records = await PatientRecord.find({ user: req.user._id })
      .populate('organization', 'name type address logo phone is24Hours')
      .lean();
    const ids = records.map((r) => r._id);

    const [visits, admissions, owing] = await Promise.all([
      Visit.find({ patient: { $in: ids }, status: { $in: ['waiting', 'triaged', 'in_consultation'] } })
        .select('patient visitNumber status complaint source createdAt')
        .lean(),
      Admission.find({ patient: { $in: ids }, status: 'admitted' })
        .populate('ward', 'name')
        .populate('bed', 'label')
        .select('patient ward bed admittedAt')
        .lean(),
      Invoice.aggregate([
        { $match: { patient: { $in: ids }, status: { $in: ['unpaid', 'partial'] } } },
        { $group: { _id: '$patient', due: { $sum: { $subtract: ['$total', '$amountPaid'] } } } },
      ]),
    ]);

    const byPatient = (rows) => Object.fromEntries(rows.map((row) => [String(row.patient ?? row._id), row]));
    const visitOf = byPatient(visits);
    const admissionOf = byPatient(admissions);
    const dueOf = byPatient(owing);

    const hospitals = records
      .filter((r) => r.organization) // skip hospitals that were deleted
      .map((r) => ({
        recordId: r._id,
        mrn: r.mrn,
        registeredAt: r.createdAt,
        hospital: r.organization,
        openVisit: visitOf[String(r._id)] ?? null,
        admission: admissionOf[String(r._id)] ?? null,
        amountDue: dueOf[String(r._id)]?.due ?? 0,
      }));

    return ok(res, hospitals);
  } catch (error) {
    return fail(res, error, 'Could not load your hospitals');
  }
};

// POST /hospital/my-visits/:id/cancel: a patient can withdraw a request that nobody has started yet
export const cancelMyVisit = async (req, res) => {
  try {
    const ids = await myRecordIds(req.user._id);
    const visit = await Visit.findOneAndUpdate(
      { _id: req.params.id, patient: { $in: ids }, source: 'patient', status: 'waiting' },
      { status: 'cancelled' },
      { new: true }
    );
    if (!visit) throw new HttpError(409, 'This request can no longer be cancelled');

    broadcast(visit.organization, 'hospital:visit', { action: 'cancelled', id: visit._id }, req.user._id);
    return ok(res, visit);
  } catch (error) {
    return fail(res, error, 'Could not cancel the request');
  }
};

/* ------------------------------------------------------------------ */
/* Care history: one timeline of everything between a patient and      */
/* their hospitals                                                     */
/* ------------------------------------------------------------------ */

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const VITAL_LABELS = [
  ['bloodPressure', 'Blood pressure', ''], ['temperature', 'Temperature', ' °C'], ['pulse', 'Pulse', ' per min'],
  ['respiratoryRate', 'Breathing', ' per min'], ['oxygenSaturation', 'Oxygen (SpO₂)', ' %'], ['weight', 'Weight', ' kg'], ['height', 'Height', ' cm'],
];
const vitalsDetails = (v) => VITAL_LABELS.filter(([key]) => v?.[key] !== undefined && v[key] !== null).map(([key, label, unit]) => ({ label, value: `${v[key]}${unit}` }));

// GET /hospital/my-activity?hospital=&group=all|visit|admission|bill|account&page=
export const getMyActivity = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 25;

    const records = (await PatientRecord.find({ user: req.user._id }).populate('organization', 'name').lean()).filter((r) => r.organization);
    const chosen = req.query.hospital ? records.filter((r) => String(r.organization._id) === req.query.hospital) : records;
    const ids = chosen.map((r) => r._id);
    const hospitalOf = Object.fromEntries(chosen.map((r) => [String(r._id), { _id: r.organization._id, name: r.organization.name }]));

    const [visits, admissions, invoices] = await Promise.all([
      Visit.find({ patient: { $in: ids } }).populate('doctor', 'fullName').sort({ createdAt: -1 }).limit(200).lean(),
      Admission.find({ patient: { $in: ids } }).select('-notes').sort({ admittedAt: -1 }).limit(100).lean(),
      Invoice.find({ patient: { $in: ids }, status: { $ne: 'void' } }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    const events = [];
    // by: who did it. 'you' = the patient, 'hospital' = the hospital
    const add = (patientId, at, group, kind, by, title, details = []) => {
      if (!at) return;
      events.push({ id: `${kind}-${events.length}`, at, group, kind, by, title, details: details.filter((d) => d.value), hospital: hospitalOf[String(patientId)] });
    };

    chosen.forEach((r) => {
      const self = String(r.registeredBy) === String(req.user._id);
      add(r._id, r.createdAt, 'account', 'registration', self ? 'you' : 'hospital',
        self ? `You registered at ${r.organization.name}` : `${r.organization.name} registered you`, [{ label: 'Record number', value: r.mrn }]);
    });

    visits.forEach((v) => {
      const fromApp = v.source === 'patient';
      add(v.patient, v.createdAt, 'visit', fromApp ? 'request' : 'queue', fromApp ? 'you' : 'hospital',
        fromApp ? 'You requested a visit' : 'You were added to the queue',
        [{ label: 'Reason', value: v.complaint }, { label: 'Visit number', value: v.visitNumber }]);
      if (v.vitals?.recordedAt) add(v.patient, v.vitals.recordedAt, 'visit', 'vitals', 'hospital', 'Your vitals were taken', vitalsDetails(v.vitals));
      add(v.patient, v.startedAt, 'visit', 'consult_start', 'hospital', 'Your consultation started', [{ label: 'Doctor', value: v.doctor && `Dr ${v.doctor.fullName}` }]);
      add(v.patient, v.completedAt, 'visit', 'consult_done', 'hospital', 'Your visit was completed', [
        { label: 'Diagnosis', value: v.diagnosis }, { label: 'Treatment plan', value: v.treatmentPlan },
        { label: 'Follow-up', value: day(v.followUpDate) }, { label: 'Doctor', value: v.doctor && `Dr ${v.doctor.fullName}` },
      ]);
      if (v.status === 'cancelled') add(v.patient, v.updatedAt, 'visit', 'cancelled', 'hospital', 'The visit was cancelled', [{ label: 'Visit number', value: v.visitNumber }]);
    });

    admissions.forEach((a) => {
      const first = a.stays?.[0];
      add(a.patient, a.admittedAt, 'admission', 'admitted', 'hospital', 'You were admitted', [
        { label: 'Ward', value: first && `${first.wardName}, bed ${first.bedLabel}` }, { label: 'Reason', value: a.reason },
      ]);
      (a.stays || []).slice(1).forEach((stay) => add(a.patient, stay.from, 'admission', 'moved', 'hospital', 'You were moved to another bed', [{ label: 'New bed', value: `${stay.wardName}, bed ${stay.bedLabel}` }]));
      (a.vitals || []).slice(-30).forEach((v) => add(a.patient, v.recordedAt, 'admission', 'vitals', 'hospital', 'Your vitals were taken on the ward', vitalsDetails(v)));
      add(a.patient, a.dischargedAt, 'admission', 'discharged', 'hospital', 'You were discharged', [
        { label: 'Summary', value: a.dischargeSummary }, { label: 'Instructions', value: a.dischargeInstructions }, { label: 'Follow-up', value: day(a.followUpDate) },
      ]);
    });

    invoices.forEach((inv) => {
      add(inv.patient, inv.createdAt, 'bill', 'bill', 'hospital', `Bill ${inv.invoiceNumber} was opened`, [
        { label: 'Charges', value: inv.items.map((i) => `${i.description} x${i.quantity}: ${naira(i.quantity * i.unitPrice)}`).join('\n') },
        { label: 'Total so far', value: naira(inv.total) },
      ]);
      inv.payments.forEach((p) => add(inv.patient, p.paidAt, 'bill', 'payment', 'hospital', 'A payment was recorded', [
        { label: 'Amount', value: naira(p.amount) }, { label: 'Method', value: p.method }, { label: 'Bill', value: inv.invoiceNumber }, { label: 'Reference', value: p.reference },
      ]));
    });

    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    const counts = { all: events.length };
    events.forEach((e) => { counts[e.group] = (counts[e.group] || 0) + 1; });

    const group = req.query.group;
    const matching = group && group !== 'all' ? events.filter((e) => e.group === group) : events;

    return ok(res, {
      events: matching.slice((page - 1) * limit, page * limit),
      total: matching.length,
      page,
      pages: Math.max(1, Math.ceil(matching.length / limit)),
      counts,
      hospitals: records.map((r) => ({ _id: r.organization._id, name: r.organization.name })),
    });
  } catch (error) {
    return fail(res, error, 'Could not load your care history');
  }
};