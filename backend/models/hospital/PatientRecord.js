import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// A patient's file at ONE hospital. The same person has a separate record (and MRN) at each hospital.
const patientRecordSchema = new mongoose.Schema(
  {
    organization: { type: ObjectId, ref: 'Organization', required: true, index: true },
    user: { type: ObjectId, ref: 'User' }, // set when the patient also has an eMedicals account
    mrn: { type: String, required: true }, // medical record number
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth: Date,
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    bloodGroup: { type: String, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: '' },
    genotype: { type: String, enum: ['', 'AA', 'AS', 'SS', 'AC', 'SC'], default: '' },
    allergies: [{ type: String, trim: true }],
    nextOfKin: { name: String, phone: String, relationship: String },
    registeredBy: { type: ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

patientRecordSchema.index({ organization: 1, mrn: 1 }, { unique: true });

export default mongoose.model('PatientRecord', patientRecordSchema);