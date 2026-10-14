import mongoose from 'mongoose';

const { Schema } = mongoose;
const oid = (ref, extra = {}) => ({ type: Schema.Types.ObjectId, ref, ...extra });

export const ORDER_STATUSES = [
  'awaiting_payment', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled',
];
// The 4-digit code is only shown to the customer while the order is live
export const CODE_VISIBLE = ['confirmed', 'preparing', 'ready', 'out_for_delivery'];

const itemSchema = new Schema(
  {
    drug: oid('Drug', { required: true }),
    name: String,
    strength: String,
    image: String,
    unitPrice: Number,
    quantity: Number,
    lineTotal: Number,
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNo: { type: String, unique: true },
    pharmacy: oid('Organization', { required: true }),
    customer: oid('User', { required: true }),
    items: [itemSchema],
    fulfilment: { type: String, enum: ['pickup', 'delivery'], required: true },
    contactPhone: String,
    delivery: {
      recipient: String,
      phone: String,
      address: String,
      note: String,
      lat: Number,
      lng: Number,
      distanceKm: Number,
      rider: { name: String, phone: String },
    },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    voucher: { code: String, discount: { type: Number, default: 0 } },
    points: { used: { type: Number, default: 0 }, discount: { type: Number, default: 0 } },
    total: { type: Number, required: true },     // what the order is worth after discounts
    amountDue: { type: Number, required: true }, // what goes through Paystack (0 = fully covered)
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    paystackRef: String,
    status: { type: String, enum: ORDER_STATUSES, default: 'awaiting_payment' },
    code: { type: String, select: false },
    codeAttempts: { type: Number, default: 0, select: false },
    sale: oid('Sale'),
    timeline: [{ status: String, note: String, at: { type: Date, default: Date.now }, _id: false }],
  },
  { timestamps: true }
);
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ pharmacy: 1, status: 1, createdAt: -1 });
orderSchema.index({ paystackRef: 1 });
export const PharmacyOrder = mongoose.model('PharmacyOrder', orderSchema);

const voucherSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: 0 },   // cap for percent vouchers (0 = no cap)
    minOrder: { type: Number, default: 0 },
    pharmacy: oid('Organization'),               // optional: restrict to one pharmacy
    expiresAt: Date,
    usageLimit: { type: Number, default: 0 },    // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Voucher = mongoose.model('Voucher', voucherSchema);