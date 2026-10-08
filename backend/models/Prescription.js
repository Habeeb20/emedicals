import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    medicine: { type: String, required: true },   // free text or name from Medicine catalog
    dosage: String,                               // "500mg"
    frequency: String,                            // "twice daily"
    duration: String,                             // "5 days"
    instructions: String,
    quantity: Number,
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicalRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    status: { type: String, enum: ['issued', 'dispensed', 'partially_dispensed', 'cancelled'], default: 'issued' },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    dispensedAt: Date,
    code: { type: String, unique: true },         // short code the pharmacist can look up
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },   // hospital that issued it
appointment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
purpose: String,                                                      // what it is for (overall)
// inside itemSchema add:
purpose: String,                                                      // what THIS drug is for
  },
  { timestamps: true }
);

export default mongoose.model('Prescription', prescriptionSchema);