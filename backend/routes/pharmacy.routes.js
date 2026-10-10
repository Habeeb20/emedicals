import { Router } from 'express';
import express from 'express';
// Adapt to your auth middleware:
//   verifyToken  -> requires login, sets req.user
//   optionalAuth -> sets req.user if a valid token is present, otherwise continues
import { verifyToken, optionalAuth } from '../middleware/auth.js';
import { pharmacyStaff, requireManager } from '../utils/pharmacy.js';


import * as inv from '../controllers/pharmacyInventory.controller.js';
import * as sales from '../controllers/pharmacySales.controller.js';
import * as reports from '../controllers/pharmacyreports.controller.js';
import * as pub from '../controllers/pharmacypublic.controller.js';
import * as plans from '../controllers/chatPlan.controller.js';
import * as chat from '../controllers/pharmacyChat.controller.js';

const router = Router();

/* ---------------- Public: find a pharmacy ---------------- */
router.get('/pharmacies', optionalAuth, pub.listPharmacies);
router.get('/pharmacies/:id', optionalAuth, pub.getPharmacy);

/* ---------------- Chat plans (pay as you go) ---------------- */
router.get('/chat-plans', plans.getPlans);
router.get('/chat-plans/me', verifyToken, plans.getMyWallet);
router.post('/chat-plans/checkout', verifyToken, plans.checkout);
router.get('/chat-plans/verify/:reference', verifyToken, plans.verifyPayment);

/* ---------------- Pharmacy chat rooms ---------------- */
router.post('/pharmacy-chat/rooms', verifyToken, chat.startRoom);
router.get('/pharmacy-chat/rooms', verifyToken, chat.listRooms);
router.get('/pharmacy-chat/rooms/:id/messages', verifyToken, chat.getMessages);

/* ---------------- Pharmacy back office (staff only) ---------------- */
const staff = [verifyToken, pharmacyStaff];
const manager = [verifyToken, pharmacyStaff, requireManager];

router.get('/pharmacy/me', staff, reports.getMe);
router.get('/pharmacy/dashboard', staff, reports.getDashboard);
router.get('/pharmacy/alerts', staff, inv.getAlerts);

// Catalog + stock (everyone can read; only the manager can change)
router.get('/pharmacy/drugs', staff, inv.listDrugs);
router.post('/pharmacy/drugs', manager, inv.createDrug);
router.patch('/pharmacy/drugs/:id', manager, inv.updateDrug);
router.get('/pharmacy/drugs/:id/batches', staff, inv.listBatches);
router.get('/pharmacy/drugs/:id/movements', staff, inv.listMovements);
router.post('/pharmacy/receipts', manager, inv.receiveStock);
router.get('/pharmacy/receipts', manager, inv.listReceipts);
router.post('/pharmacy/adjustments', manager, inv.adjustStock);
router.post('/pharmacy/batches/:id/quarantine', manager, inv.resolveQuarantine);
router.get('/pharmacy/suppliers', staff, inv.listSuppliers);
router.post('/pharmacy/suppliers', manager, inv.createSupplier);
router.patch('/pharmacy/suppliers/:id', manager, inv.updateSupplier);

// Attending patients and selling
router.get('/pharmacy/prescriptions/:id', staff, sales.getPrescription);
router.post('/pharmacy/sales', staff, sales.createSale);
router.get('/pharmacy/sales', staff, sales.listSales);
router.get('/pharmacy/sales/:id', staff, sales.getSale);
router.post('/pharmacy/sales/:id/return', manager, sales.returnSale);

// Reports (manager)
router.get('/pharmacy/reports/summary', manager, reports.getSummary);
router.get('/pharmacy/reports/valuation', manager, reports.getValuation);
router.get('/pharmacy/reports/controlled', manager, reports.getControlledRegister);

export default router;








































/**
 * Paystack webhook. It needs the RAW body to check the signature, so mount this
 * BEFORE app.use(express.json()):
 *
 *   import { webhookRouter } from './routes/pharmacy.routes.js';
 *   app.use('/api', webhookRouter);
 *   app.use(express.json());
 */
import { chatPlanpaystackWebhook } from '../controllers/chatPlan.controller.js';
export const webhookRouter = Router().post(
  '/chat-plans/webhook',
  express.raw({ type: 'application/json' }),
 chatPlanpaystackWebhook
);
