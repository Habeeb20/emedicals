import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], required: true },
    start: { type: String, required: true },   // "09:00"
    end: { type: String, required: true },     // "13:00"
  },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialization: { type: String, required: true, index: true },
    licenseNumber: { type: String, required: true },   // MDCN number
    yearsOfExperience: Number,
    bio: String,
    consultationFee: { type: Number, default: 0 },
    organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }],
    availability: [slotSchema],
    isAvailableOnline: { type: Boolean, default: false },
    paymentSettings: {
  mode: { type: String, enum: ['arrival', 'booking', 'deposit'], default: 'arrival' },
  appointmentFee: Number,          // falls back to consultationFee
  depositAmount: { type: Number, default: 0 },
},
  },
  { timestamps: true }
);

export default mongoose.model('DoctorProfile', doctorProfileSchema);