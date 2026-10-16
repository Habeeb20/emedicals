import express from 'express';
import { verifyToken } from '../middleware/auth.js'; // your existing login check: it must set req.user
import { hospitalStaff, patientOnly } from '../utils/hospitalAccess.js';

import { registerPatient, listPatients, getPatient, updatePatient } from '../controllers/hospital/patient.controller.js';
import { createVisit, listVisits, recordVitals, startConsultation, saveConsultation, cancelVisit } from '../controllers/hospital/visit.controller.js';
import { listWards, createWard, updateWard, deleteWard, addBeds, setBedStatus, deleteBed } from '../controllers/hospital/ward.controller.js';
import { listAdmissions, getAdmission, admitPatient, addVitals, addNote, transferBed, dischargePatient } from '../controllers/hospital/admission.controller.js';
import { listInvoices, getInvoice, chargePatient, addItem, recordPayment, setDiscount, voidInvoice } from '../controllers/hospital/billing.controller.js';
import { listStaff, updateStaff } from '../controllers/hospital/staff.controller.js';
import { getStats } from '../controllers/hospital/stats.controller.js';
import { getMyRecords, getMyInvoices } from '../controllers/hospital/portal.controller.js';
import { getMyHospitals } from '../controllers/hospital/portal.controller.js';
import { myStatusAtHospital } from '../controllers/hospital/directory.controller.js';
import { registerWithHospital } from '../controllers/hospital/directory.controller.js';
import { requestVisit } from '../controllers/hospital/directory.controller.js';
import { listHospitals } from '../controllers/hospital/directory.controller.js';
import { getFilterOptions } from '../controllers/hospital/directory.controller.js';
import { getHospital } from '../controllers/provider.controller.js';
import { cancelMyVisit } from '../controllers/hospital/portal.controller.js';
import { getMyActivity } from '../controllers/hospital/portal.controller.js';
const router = express.Router();


// Public: anyone (even logged out) can browse hospitals. Order matters: /filters must come before /:id
router.get('/directory', listHospitals);
router.get('/directory/filters', getFilterOptions);
router.get('/directory/:id', getHospital);

router.use(verifyToken);









// Everything below needs a logged-in user


// Who may do what
const anyStaff = hospitalStaff('doctor', 'nurse', 'hospital_admin');
const clinical = hospitalStaff('doctor', 'nurse'); // vitals and notes
const doctor = hospitalStaff('doctor');
const admin = hospitalStaff('hospital_admin');
const canAdmit = hospitalStaff('doctor', 'hospital_admin');
const canCharge = hospitalStaff('doctor', 'nurse', 'hospital_admin');

// Patients
router.route('/patients').get(anyStaff, listPatients).post(anyStaff, registerPatient);
router.route('/patients/:id').get(anyStaff, getPatient).patch(anyStaff, updatePatient);
router.post('/patients/:id/charges', canCharge, chargePatient);

// Visits and consultations
router.route('/visits').get(anyStaff, listVisits).post(anyStaff, createVisit);
router.post('/visits/:id/vitals', clinical, recordVitals);
router.post('/visits/:id/start', doctor, startConsultation);
router.patch('/visits/:id', doctor, saveConsultation);
router.post('/visits/:id/cancel', anyStaff, cancelVisit);

// Wards and beds
router.route('/wards').get(anyStaff, listWards).post(admin, createWard);
router.route('/wards/:id').patch(admin, updateWard).delete(admin, deleteWard);
router.post('/wards/:id/beds', admin, addBeds);
router.route('/beds/:id').patch(admin, setBedStatus).delete(admin, deleteBed);

// Admissions
router.route('/admissions').get(anyStaff, listAdmissions).post(canAdmit, admitPatient);
router.get('/admissions/:id', anyStaff, getAdmission);
router.post('/admissions/:id/vitals', clinical, addVitals);
router.post('/admissions/:id/notes', clinical, addNote);
router.post('/admissions/:id/transfer', anyStaff, transferBed);
router.post('/admissions/:id/discharge', canAdmit, dischargePatient);

// Billing
router.get('/invoices', admin, listInvoices);
router.get('/invoices/:id', admin, getInvoice);
router.post('/invoices/:id/items', canCharge, addItem);
router.post('/invoices/:id/payments', admin, recordPayment);
router.patch('/invoices/:id/discount', admin, setDiscount);
router.post('/invoices/:id/void', admin, voidInvoice);

// Staff and overview
router.get('/staff', admin, listStaff);
router.patch('/staff/:id', admin, updateStaff);
router.get('/stats', admin, getStats);

// Patient portal
router.get('/my-records', patientOnly, getMyRecords);
router.get('/my-invoices', patientOnly, getMyInvoices);
router.get('/my-hospitals', patientOnly, getMyHospitals);
router.post('/my-visits/:id/cancel', patientOnly, cancelMyVisit);
router.get('/my-activity', patientOnly, getMyActivity);

// Patient joins a hospital and interacts with it
router.get('/directory/:id/me', patientOnly, myStatusAtHospital);
router.post('/directory/:id/register', patientOnly, registerWithHospital);
router.post('/directory/:id/request-visit', patientOnly, requestVisit);

export default router;





































