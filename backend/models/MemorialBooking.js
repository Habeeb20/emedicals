import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'admitted', 'completed', 'rejected', 'cancelled'];
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'admitted'];

/*
  Mortuary : pending -> confirmed -> admitted -> completed (released)
  Cemetery : pending -> confirmed -> completed (buried)
  Either   : pending -> rejected | confirmed -> cancelled | pending -> cancelled (by client)
  Every change is appended to `history`, and every naira that moves is a LedgerEntry.
*/
const historySchema = new Schema(
  {
    status: { type: String, required: true },
    note: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    byRole: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingSchema = new Schema(
  {
    reference: { type: String, unique: true },
    kind: { type: String, enum: ['mortuary', 'cemetery'], required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending', index: true },

    deceased: {
      fullName: { type: String, required: true, trim: true },
      gender: { type: String, enum: ['male', 'female', 'other'] },
      age: Number,
      dateOfBirth: Date,
      dateOfDeath: Date,
      placeOfDeath: String,
      causeOfDeath: String,
    },
    contact: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, lowercase: true, trim: true },
      relationship: String,
      address: String,
    },

    mortuary: {
      expectedAdmission: Date,
      expectedDays: Number,
      transportRequired: { type: Boolean, default: false },
      pickupAddress: String,
      record: { type: Schema.Types.ObjectId, ref: 'MortuaryRecord' },
    },
    cemetery: {
      plot: { type: Schema.Types.ObjectId, ref: 'CemeteryPlot' },
      burialDate: Date,
      burialTime: String,
    },

    services: [{ name: String, price: Number, _id: false }],
    quoteLines: [{ label: String, amount: { type: Number, min: 0, default: 0 }, _id: false }],
    quote: { type: Number, default: 0 },          // estimate at request time (server-computed)
    chargesPosted: { type: Boolean, default: false },
    charges: { type: Number, default: 0 },        // sum of ledger charges
    amountPaid: { type: Number, default: 0 },     // payments - refunds
    paymentStatus: { type: String, enum: ['unpaid', 'part_paid', 'paid', 'refunded'], default: 'unpaid' },

    notes: { type: String, maxlength: 1000 },
    decisionNote: String,
    history: [historySchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

bookingSchema.index({ organization: 1, status: 1, createdAt: -1 });
bookingSchema.index({ client: 1, createdAt: -1 });

bookingSchema.virtual('balance').get(function () {
  return Math.max((this.charges || 0) - (this.amountPaid || 0), 0);
});

bookingSchema.pre('validate', async function () {
  if (!this.reference) {
    const prefix = this.kind === 'mortuary' ? 'MQ' : 'CM';
    this.reference = `${prefix}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  }
});

bookingSchema.methods.log = function (status, note, user) {
  this.history.push({ status, note, by: user?._id, byRole: user?.role });
};

export default mongoose.model('MemorialBooking', bookingSchema);
