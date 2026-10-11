import { Router } from 'express';
import { restrictTo } from '../middleware/auth.js';   // <- your existing JWT middleware (names assumed)
import { verifyToken } from '../middleware/auth.js';
import * as providers from '../controllers/provider.controller.js';
import * as appts from '../controllers/appointment.controller.js';
import * as rx from '../controllers/prescription.controller.js';
import * as qc from '../controllers/quickchat.controller.js';
import * as chat from '../controllers/chat.controller.js';
import * as notif from '../controllers/notification.controller.js';
import * as pay from '../controllers/payment.controller.js';

const router = Router();
const patient = restrictTo('patient');
const provider = restrictTo('doctor', 'hospital_admin');

// providers (browse + settings)
router.get('/providers', verifyToken, providers.listProviders);
router.get('/providers/departments', verifyToken, providers.listDepartments);
router.get('/providers/doctors/:id', verifyToken, providers.getDoctor);
router.get('/providers/hospitals/:id', verifyToken, providers.getHospital);
router.patch('/providers/me/settings', verifyToken, restrictTo('doctor', 'hospital_admin', 'super_admin'), providers.updateMySettings);

// appointments (static paths BEFORE /:id)
router.post('/appointments', verifyToken, patient, appts.createAppointment);
router.get('/appointments/mine', verifyToken, patient, appts.myAppointments);
router.get('/appointments/provider', verifyToken, provider, appts.providerAppointments);
router.get('/appointments/:id', verifyToken, appts.getAppointment);
router.post('/appointments/:id/accept', verifyToken, provider, appts.acceptAppointment);
router.post('/appointments/:id/reject', verifyToken, provider, appts.rejectAppointment);
router.post('/appointments/:id/skip', verifyToken, provider, appts.skipAppointment);
router.post('/appointments/:id/cancel', verifyToken, patient, appts.cancelAppointment);
router.post('/appointments/:id/pay', verifyToken, patient, appts.payForAppointment);
router.post('/appointments/:id/collect-payment', verifyToken, provider, appts.collectPayment);
router.patch('/appointments/:id/status', verifyToken, provider, appts.updateStatus);

// prescriptions
router.get('/prescriptions/mine', verifyToken, patient, rx.myPrescriptions);
router.patch('/prescriptions/visibility', verifyToken, patient, rx.setVisibility);
router.get('/prescriptions/search',  rx.searchPrescriptions);
// router.get('/prescriptions/search', verifyToken, restrictTo('pharmacist'), rx.searchPrescriptions);
router.patch('/prescriptions/:id/dispense', verifyToken, restrictTo('pharmacist'), rx.dispense);

// quick chat
router.get('/quickchat/plans', verifyToken, patient, qc.listPlans);
router.post('/quickchat/subscribe', verifyToken, patient, qc.subscribe);
router.post('/quickchat/requests', verifyToken, patient, qc.createRequest);
router.get('/quickchat/requests/mine', verifyToken, patient, qc.myRequests);
router.get('/quickchat/requests/open', verifyToken, provider, qc.openRequests);
router.post('/quickchat/requests/:id/accept', verifyToken, provider, qc.acceptRequest);
router.post('/quickchat/requests/:id/close', verifyToken, qc.closeRequest);

// chat history, notifications, payments
router.get('/chat/rooms', verifyToken, chat.myRooms);
router.get('/chat/rooms/:id/messages', verifyToken, chat.roomMessages);
router.get('/notifications', verifyToken, notif.myNotifications);
router.patch('/notifications/read', verifyToken, notif.markRead);
router.patch('/notifications/:id/read', verifyToken, notif.markRead);
router.get('/payments/verify/:reference', verifyToken, pay.verifyPayment);

export default router;
