import express from 'express';
// Adjust to your own auth middleware names/paths
import { verifyToken, authorize, optionalAuth } from '../middleware/auth.js';
import * as c from '../controllers/labController.js';

const router = express.Router();
const staff = authorize('lab_tech', 'hospital_admin');

/* ========== 1. STATIC ROUTES FIRST ========== */

// Browse labs (guests allowed)
router.get('/', optionalAuth, c.listLabs);

// Orders (patient, doctor, or lab staff)
router.post('/orders', verifyToken, authorize('patient', 'doctor', 'lab_tech', 'hospital_admin'), c.createOrder);
router.get('/orders/mine', verifyToken, authorize('patient'), c.myOrders);
router.get('/orders/:id', verifyToken, c.getOrder);
router.put('/orders/:id/cancel', verifyToken, c.cancelOrder);

// Lab staff
router.get('/staff/tests', verifyToken, staff, c.staffListTests);
router.post('/staff/tests', verifyToken, staff, c.staffCreateTest);
router.put('/staff/tests/:id', verifyToken, staff, c.staffUpdateTest);
router.delete('/staff/tests/:id', verifyToken, staff, c.staffDeleteTest);
router.get('/staff/orders', verifyToken, staff, c.staffListOrders);
router.put('/staff/orders/:id/collect', verifyToken, staff, c.collectSample);
router.put('/staff/orders/:id/results', verifyToken, staff, c.saveResults);
router.put('/staff/orders/:id/complete', verifyToken, staff, c.completeOrder);
router.put('/staff/orders/:id/payment', verifyToken, staff, c.setPayment);


router.get('/doctor/patients',               verifyToken,  c.searchPatients);
router.get('/doctor/orders',                 verifyToken,  c.doctorOrders);
router.post('/doctor/orders',                verifyToken,  c.doctorCreateOrder);
router.get('/doctor/orders/:id',             verifyToken,  c.doctorOrder);
router.post('/doctor/orders/:id/cancel',     verifyToken,  c.doctorCancelOrder);
router.post('/doctor/orders/:id/pay',        verifyToken,  c.payLabOrder);
router.get('/doctor/payments/:reference/verify', verifyToken,  c.verifyLabPayment);

/* ========== 2. DYNAMIC ROUTES LAST ========== */

router.get('/:id', optionalAuth, c.getLab);
router.get('/:labId/tests', c.listLabTests); // public catalog for one lab
router.post('/:id/view', optionalAuth, c.recordLabView);
router.post('/:id/like', verifyToken, c.toggleLabLike);
router.post('/:id/share', optionalAuth, c.shareLab);
router.get('/:id/reviews', c.listLabReviews);
router.post('/:id/reviews', verifyToken, c.saveLabReview);
router.delete('/:id/reviews/mine', verifyToken, c.deleteMyLabReview);

export default router;
// app.use('/api/labs', labRoutes);