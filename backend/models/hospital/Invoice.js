import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const itemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['consultation', 'bed', 'drug', 'lab', 'procedure', 'other'],
    default: 'other',
  },
  quantity: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  addedBy: { type: ObjectId, ref: 'User' },
  addedAt: { type: Date, default: Date.now },
});

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 1 },
  method: { type: String, enum: ['cash', 'card', 'transfer', 'insurance'], default: 'cash' },
  reference: { type: String, trim: true },
  receivedBy: { type: ObjectId, ref: 'User' },
  paidAt: { type: Date, default: Date.now },
});

const invoiceSchema = new mongoose.Schema(
  {
    organization: { type: ObjectId, ref: 'Organization', required: true, index: true },
    patient: { type: ObjectId, ref: 'PatientRecord', required: true, index: true },
    invoiceNumber: { type: String, required: true },
    items: [itemSchema],
    discount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 }, // subtotal - discount
    amountPaid: { type: Number, default: 0 },
    payments: [paymentSchema],
    status: { type: String, enum: ['unpaid', 'partial', 'paid', 'void'], default: 'unpaid', index: true },
    voidReason: String,
  },
  { timestamps: true }
);

invoiceSchema.index({ organization: 1, invoiceNumber: 1 }, { unique: true });

// Totals and status are always worked out from the items and payments, never typed in by hand
invoiceSchema.methods.recalculate = function () {
  this.subtotal = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  this.total = Math.max(0, this.subtotal - this.discount);
  this.amountPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (this.status === 'void') return;
  if (this.amountPaid > 0 && this.amountPaid >= this.total) this.status = 'paid';
  else if (this.amountPaid > 0) this.status = 'partial';
  else this.status = 'unpaid';
};

invoiceSchema.pre('validate', async function () {
  this.recalculate();
});

export default mongoose.model('Invoice', invoiceSchema);