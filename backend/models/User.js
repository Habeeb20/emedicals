import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import engagementPlugin from "./plugins/engagement.js"


export const ROLES = [
  'patient', 'doctor', 'nurse', 'lab_tech', 'pharmacist',
  'hospital_admin', 'mortuary_officer', 'cemetery_officer', 'super_admin',
];

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'patient', index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: Date,
    profilePicture:{type:String},
    avatar: { url: String, publicId: String },
    isVerified: { type: Boolean, default: false },   // email/phone verified
    isApproved: { type: Boolean, default: true },    // set false for staff roles until admin approves
    isActive: { type: Boolean, default: true },
    state: String,                         // slug or name from the location API, e.g. "lagos"
lga: String,
address: String,
coordinates: { lat: Number, lng: Number },   // filled from GPS or geocoded from address
prescriptionPublic: { type: Boolean, default: false },
    otp: {
      codeHash: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      attempts: { type: Number, default: 0, select: false },
      lastSentAt: { type: Date, select: false },
    },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.plugin(engagementPlugin);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.password; delete ret.otp; delete ret.__v; return ret; },
});

export default mongoose.model('User', userSchema);
































