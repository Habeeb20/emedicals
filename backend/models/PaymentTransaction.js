import mongoose from 'mongoose';
const { Schema } = mongoose;

const txSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: ['appointment', 'quickchat'], required: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    planId: String,
    credits: Number,
    amount: { type: Number, required: true },         // naira
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    paidAt: Date,
  },
  { timestamps: true }
);
export default mongoose.model('PaymentTransaction', txSchema);
