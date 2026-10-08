import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    complaint: String,
    vitals: {
      temperature: Number,     // °C
      bloodPressure: String,   // "120/80"
      pulse: Number,
      weight: Number,          // kg
      height: Number,          // cm
      spo2: Number,
    },
    diagnosis: String,
    notes: String,
    attachments: [{ url: String, publicId: String, name: String }],
  },
  { timestamps: true }
);

export default mongoose.model('MedicalRecord', medicalRecordSchema);