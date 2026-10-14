import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as shop from '../controllers/shopController.js';

const router = Router();

/* Public: browsing needs no login */
router.get('/categories', shop.listCategories);
router.get('/drugs', shop.listDrugs);
router.get('/drugs/:id', shop.getDrug);
router.get('/geocode', shop.geocode);

/* Logged in: checkout and orders */
router.get('/rewards', verifyToken, shop.getRewards);
router.post('/checkout/preview', verifyToken, shop.previewCheckout);
router.post('/checkout', verifyToken, shop.checkout);
router.get('/orders', verifyToken, shop.listMyOrders);
router.get('/orders/:id', verifyToken, shop.getMyOrder);
router.post('/orders/:id/verify', verifyToken, shop.verifyMyOrder);
router.post('/orders/:id/pay', verifyToken, shop.payMyOrder);
router.post('/orders/:id/cancel', verifyToken, shop.cancelMyOrder);

/* Admin */
router.post('/vouchers', verifyToken, shop.createVoucher);

export default router;

/*
 * ADD TO routes/pharmacy.routes.js
 *
 * import * as orders from '../controllers/pharmacyOrders.controller.js';
 *
 * router.get('/pharmacy/orders', staff, orders.listOrders);
 * router.patch('/pharmacy/orders/:id/status', staff, orders.setStatus);
 * router.post('/pharmacy/orders/:id/verify', staff, orders.verifyCode);
 * router.post('/pharmacy/orders/:id/reject', staff, orders.rejectOrder);
 *
 * MOUNT in app.js (after express.json()):
 *   import shopRouter from './routes/shop.routes.js';
 *   app.use('/api', shopRouter);
 *
 * PAYSTACK WEBHOOK: Paystack has one webhook URL per account, so reuse your existing
 * chatPlanpaystackWebhook. After its signature check, add:
 *
 *   import { confirmPaymentByReference } from './shop.controller.js';
 *   const ref = event?.data?.reference;
 *   if (event?.event === 'charge.success' && ref?.startsWith('ORD-')) {
 *     await confirmPaymentByReference(ref);
 *     return res.sendStatus(200);
 *   }
 *
 * EDIT models/Pharmacy.js (saleSchema):
 *   type: { type: String, enum: ['prescription', 'walk_in', 'online'], required: true },
 *
 * EDIT controllers/pharmacySales.controller.js (listSales):
 *   if (['prescription', 'walk_in', 'online'].includes(req.query.type)) filter.type = req.query.type;
 *
 * .env (all optional except CLIENT_URL and PAYSTACK_SECRET_KEY):
 *   CLIENT_URL=https://yourfrontend.com
 *   POINT_VALUE_NGN=5            # ₦ per loyalty point
 *   DELIVERY_BASE_FEE=500  DELIVERY_PER_KM=120  DELIVERY_MAX_KM=25
 * ------------------------------------------------------------------ */