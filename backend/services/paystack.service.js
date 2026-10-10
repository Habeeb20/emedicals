import crypto from 'crypto';
import { HttpError } from '../utils/engagement.js';

const BASE = 'https://api.paystack.co';

const headers = () => {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new HttpError(500, 'Payments are not configured');
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' };
};

async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers: headers() });
  } catch {
    throw new HttpError(502, 'Could not reach the payment provider. Try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.status) throw new HttpError(502, json.message || 'Payment provider error');
  return json.data;
}

// amountNaira is converted to kobo for Paystack
export const initializeTransaction = ({ email, amountNaira, reference, callbackUrl, metadata }) =>
  call('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({ email, amount: Math.round(amountNaira * 100), reference, callback_url: callbackUrl, metadata }),
  });

export const verifyTransaction = (reference) => call(`/transaction/verify/${encodeURIComponent(reference)}`);

// Webhook signature check. `rawBody` must be the unparsed request body (Buffer).
export function validWebhookSignature(rawBody, signature) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}