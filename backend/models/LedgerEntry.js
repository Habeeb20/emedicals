import mongoose from 'mongoose';

const { Schema } = mongoose;

/* Accounting ledger. Entries are append-only: a mistake is fixed with a refund or an extra charge. */
const ledgerSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    booking: { type: Schema.Types.ObjectId, ref: 'MemorialBooking', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['charge', 'payment', 'refund'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ['cash', 'transfer', 'pos', 'online', 'other'] },
    reference: String,
    description: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ledgerSchema.index({ organization: 1, createdAt: -1 });

// Recompute the totals stored on the booking (and mirror them onto the mortuary record).
ledgerSchema.statics.recalc = async function (bookingId) {
  const [row] = await this.aggregate([
    { $match: { booking: new mongoose.Types.ObjectId(String(bookingId)) } },
    {
      $group: {
        _id: null,
        charges: { $sum: { $cond: [{ $eq: ['$type', 'charge'] }, '$amount', 0] } },
        payments: { $sum: { $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0] } },
        refunds: { $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0] } },
      },
    },
  ]);
  const charges = Math.round((row?.charges || 0) * 100) / 100;
  const net = Math.round(((row?.payments || 0) - (row?.refunds || 0)) * 100) / 100;

  let paymentStatus = 'unpaid';
  if ((row?.refunds || 0) > 0 && net <= 0) paymentStatus = 'refunded';
  else if (charges > 0 && net >= charges) paymentStatus = 'paid';
  else if (net > 0) paymentStatus = 'part_paid';

  const booking = await mongoose
    .model('MemorialBooking')
    .findByIdAndUpdate(bookingId, { charges, amountPaid: net, paymentStatus }, { new: true });

  const recordId = booking?.mortuary?.record;
  if (recordId) {
    await mongoose.model('MortuaryRecord').findByIdAndUpdate(recordId, {
      charges,
      paymentStatus: paymentStatus === 'paid' ? 'paid' : net > 0 ? 'part_paid' : 'unpaid',
    });
  }
  return booking;
};

export default mongoose.model('LedgerEntry', ledgerSchema);
