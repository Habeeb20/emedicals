

import mongoose from 'mongoose';
const { Schema } = mongoose;

export const APPT_STATUS = [
  'pending',           // waiting for doctor/hospital decision
  'awaiting_payment',  // accepted, patient must pay (booking / deposit modes)
  'confirmed',         // accepted (+ paid if required) -> chat opens
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
  'no_show',
];
export const ACTIVE_STATUS = ['pending', 'awaiting_payment', 'confirmed', 'in_progress'];
export const PAYMENT_MODES = ['arrival', 'booking', 'deposit'];

const appointmentSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'User', index: true },          // set when booked directly, or when a hospital doctor accepts
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    department: { type: String, trim: true, index: true },

    date: { type: String, required: true },       // "YYYY-MM-DD" (Africa/Lagos)
    time: String,                                  // optional "10:30"
    reason: { type: String, trim: true, maxlength: 1000 },

    status: { type: String, enum: APPT_STATUS, default: 'pending', index: true },

    queueKey: { type: String, index: true },       // d:<doctorId>:<date> or o:<orgId>:<date>
    queueNumber: Number,
    skipCount: { type: Number, default: 0 },

    payment: {
      mode: { type: String, enum: PAYMENT_MODES, default: 'arrival' },
      totalAmount: { type: Number, default: 0 },
      depositAmount: { type: Number, default: 0 },
      amountPaid: { type: Number, default: 0 },
      status: { type: String, enum: ['free', 'unpaid', 'partial', 'paid'], default: 'unpaid' },
      lastReference: String,
      paidAt: Date,
      refundRequired: { type: Boolean, default: false },
    },

    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
    rejectionReason: String,

    chatRoom: { type: Schema.Types.ObjectId, ref: 'ChatRoom' },

    outcome: {
      condition: String,        // e.g. "stable", "needs follow-up", "referred"
      diagnosis: String,
      notes: String,
      followUpDate: String,
      completedAt: Date,
    },
    prescriptions: [{ type: Schema.Types.ObjectId, ref: 'Prescription' }],
  },
  { timestamps: true }
);

appointmentSchema.index({ queueKey: 1, status: 1, queueNumber: 1 });
appointmentSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.model('Appointment', appointmentSchema);
