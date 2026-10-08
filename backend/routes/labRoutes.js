import express from 'express';
// Adjust to your own auth middleware names/paths
import { verifyToken, authorize } from '../middleware/auth.js';

import * as c from '../controllers/labController.js';

const router = express.Router();
const staff = authorize('lab_tech', 'hospital_admin');

router.get('/', c.listLabs);

// Orders (patient, doctor, or lab staff)
router.post('/orders', verifyToken, authorize('patient', 'doctor', 'lab_tech', 'hospital_admin'), c.createOrder);
router.get('/orders/mine', verifyToken, authorize('patient'), c.myOrders);
router.get('/orders/:id', verifyToken, c.getOrder);
router.patch('/orders/:id/cancel', verifyToken, c.cancelOrder);

// Lab staff
router.get('/staff/tests', verifyToken, staff, c.staffListTests);
router.post('/staff/tests', verifyToken, staff, c.staffCreateTest);
router.patch('/staff/tests/:id', verifyToken, staff, c.staffUpdateTest);
router.delete('/staff/tests/:id', verifyToken, staff, c.staffDeleteTest);
router.get('/staff/orders', verifyToken, staff, c.staffListOrders);
router.patch('/staff/orders/:id/collect', verifyToken, staff, c.collectSample);
router.patch('/staff/orders/:id/results', verifyToken, staff, c.saveResults);
router.patch('/staff/orders/:id/complete', verifyToken, staff, c.completeOrder);
router.patch('/staff/orders/:id/payment', verifyToken, staff, c.setPayment);

// Keep last: public catalog for one lab
router.get('/:labId/tests', c.listLabTests);

export default router;
// app.use('/api/labs', labRoutes);