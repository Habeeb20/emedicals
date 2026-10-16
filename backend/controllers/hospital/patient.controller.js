import User from '../../models/User.js';
import PatientRecord from '../../models/hospital/PatientRecord.js';
import Visit from '../../models/hospital/Visit.js';
import Admission from '../../models/hospital/Admission.js';
import Invoice from '../../models/hospital/Invoice.js';
import { nextNumber } from '../../models/hospital/Counter.js';
import { broadcast } from '../../services/hospitalRealtime.js';
import { ok, fail, HttpError, escapeRegex, toList } from '../../utils/http.js';

const EDITABLE = ['fullName', 'gender', 'dateOfBirth', 'phone', 'address', 'bloodGroup', 'genotype'];

// POST /hospital/patients: register a new patient and give them a medical record number
export const registerPatient = async (req, res) => {
  try {
    const { fullName, gender, dateOfBirth, phone, email, address, bloodGroup, genotype, allergies, nextOfKin } = req.body;
    if (!fullName?.trim()) throw new HttpError(400, 'Full name is required');
    if (!gender) throw new HttpError(400, 'Gender is required');

    // If this person already has an eMedicals patient account, link it so they can see their own records
    let account = null;
    if (email?.trim()) {
      account = await User.findOne({ email: email.trim().toLowerCase(), role: 'patient' }).select('_id');
      if (account && (await PatientRecord.exists({ organization: req.orgId, user: account._id }))) {
        throw new HttpError(409, 'This patient is already registered at your hospital');
      }
    }

    const patient = await PatientRecord.create({
      organization: req.orgId,
      user: account?._id,
      mrn: await nextNumber(`mrn:${req.orgId}`, 'MRN'),
      fullName: fullName.trim(),
      gender,
      dateOfBirth: dateOfBirth || undefined,
      phone,
      email,
      address,
      bloodGroup,
      genotype,
      allergies: toList(allergies),
      nextOfKin,
      registeredBy: req.user._id,
    });

    broadcast(req.orgId, 'hospital:patient', { action: 'created', id: patient._id });
    console.log(patient)
    return ok(res, patient, 201);
  } catch (error) {
    return fail(res, error, 'Could not register the patient');
  }
};

// GET /hospital/patients?q=: search by name, MRN or phone
export const listPatients = async (req, res) => {
  try {
    const filter = { organization: req.orgId, isActive: true };
    console.log(filter)
    const q = String(req.query.q || '').trim();
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i');
    //   filter.$or = [{ fullName: pattern }, { mrn: pattern }, { phone: pattern }];
    }
    const patients = await PatientRecord.find(filter).sort({ createdAt: -1 }).limit(40).lean();
    console.log(patients)
    return ok(res, patients);
  } catch (error) {
    return fail(res, error, 'Could not load patients');
  }
};

// GET /hospital/patients/:id: the full file: details, recent visits, admissions and bills
export const getPatient = async (req, res) => {
  try {
    const patient = await PatientRecord.findOne({ _id: req.params.id, organization: req.orgId }).lean();
    if (!patient) throw new HttpError(404, 'Patient not found');

    const [visits, admissions, invoices] = await Promise.all([
      Visit.find({ patient: patient._id }).populate('doctor', 'fullName').sort({ createdAt: -1 }).limit(10).lean(),
      Admission.find({ patient: patient._id }).populate('ward', 'name').sort({ admittedAt: -1 }).limit(5).select('-notes -vitals').lean(),
      Invoice.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(5).select('invoiceNumber total amountPaid status createdAt').lean(),
    ]);

    return ok(res, { patient, visits, admissions, invoices });
  } catch (error) {
    return fail(res, error, 'Could not load the patient');
  }
};

// PATCH /hospital/patients/:id
export const updatePatient = async (req, res) => {
  try {
    const patient = await PatientRecord.findOne({ _id: req.params.id, organization: req.orgId });
    if (!patient) throw new HttpError(404, 'Patient not found');

    EDITABLE.forEach((field) => {
      if (req.body[field] !== undefined) patient[field] = req.body[field];
    });
    if (req.body.allergies !== undefined) patient.allergies = toList(req.body.allergies);
    if (req.body.nextOfKin !== undefined) patient.nextOfKin = req.body.nextOfKin;

    await patient.save();
    broadcast(req.orgId, 'hospital:patient', { action: 'updated', id: patient._id });
    return ok(res, patient);
  } catch (error) {
    return fail(res, error, 'Could not update the patient');
  }
};