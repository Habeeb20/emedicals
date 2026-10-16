import express from 'express';
import { protect } from '../middleware/auth.js'; // same login check as hospital.routes.js
import { hospitalStaff, patientOnly } from '../utils/hospitalAccess.js';
import {
  listMyThreads, getMyThread, sendFromPatient, getInbox, getStaffThread, replyToPatient,
} from '../controllers/hospital/message.controller.js';

// Mount in app.js:  app.use('/api/hospital/messages', hospitalMessageRoutes);
// Put it ABOVE app.use('/api/hospital', hospitalRoutes) so this path is matched first.
const router = express.Router();
router.use(protect);

const anyStaff = hospitalStaff('doctor', 'nurse', 'hospital_admin');

// Patient
router.get('/mine', patientOnly, listMyThreads);
router.get('/mine/:recordId', patientOnly, getMyThread);
router.post('/mine/:recordId', patientOnly, sendFromPatient);

// Hospital staff
router.get('/inbox', anyStaff, getInbox);
router.get('/inbox/:patientId', anyStaff, getStaffThread);
router.post('/inbox/:patientId', anyStaff, replyToPatient);

export default router;