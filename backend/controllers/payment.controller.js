import { asyncHandler, AppError } from '../utils/helpers.js';
import { settleTransaction, validWebhookSignature } from '../services/payment.service.js';
import PaymentTransaction from '../models/PaymentTransaction.js';

/** POST /payments/webhook — mount with express.raw() BEFORE express.json() */
export const paystackWebhook = asyncHandler(async (req, res) => {
  if (!validWebhookSignature(req.body, req.headers['x-paystack-signature'])) return res.sendStatus(401);
  const event = JSON.parse(req.body.toString('utf8'));
  if (event.event === 'charge.success') await settleTransaction(event.data.reference);
  res.sendStatus(200);
});

/** GET /payments/verify/:reference — called by the client after the Paystack redirect */
export const verifyPayment = asyncHandler(async (req, res) => {
  const tx = await PaymentTransaction.findOne({ reference: req.params.reference, user: req.user._id });
  if (!tx) throw new AppError('Transaction not found', 404);
  const settled = await settleTransaction(tx.reference);
  res.json({ status: 'success', data: { reference: tx.reference, paymentStatus: settled.status, purpose: tx.purpose } });
});
