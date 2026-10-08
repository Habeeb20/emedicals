import mongoose from 'mongoose';
import engagementPlugin from './plugins/engagement.js';

export const ORG_TYPES = ['hospital', 'clinic', 'lab', 'pharmacy', 'mortuary', 'cemetery'];

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ORG_TYPES, required: true, index: true },
    registrationNumber: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'Nigeria' },
    },
    logo: { url: String, publicId: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    departments: [{ type: String, trim: true }],            // "Cardiology", "Pediatrics"...
coordinates: { lat: Number, lng: Number },              // set automatically by PATCH /providers/me/settings when address is sent
paymentSettings: {
  mode: { type: String, enum: ['arrival', 'booking', 'deposit'], default: 'arrival' },
  appointmentFee: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
},
    status: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' },
  },
  { timestamps: true }
);

organizationSchema.plugin(engagementPlugin);

export default mongoose.model('Organization', organizationSchema);