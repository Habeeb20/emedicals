import mongoose from 'mongoose';

const patientProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    patientId: { type: String, unique: true },       // human-friendly ID, e.g. EM-000123
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    genotype: { type: String, enum: ['AA', 'AS', 'SS', 'AC', 'SC'] },
    allergies: [String],
    chronicConditions: [String],
    address: String,
    nextOfKin: { name: String, relationship: String, phone: String, address: String },
  },
  { timestamps: true }
);

export default mongoose.model('PatientProfile', patientProfileSchema);