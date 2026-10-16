import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// One message between a patient and a hospital.
// A conversation = all messages that share the same PatientRecord (one patient at one hospital).
const hospitalMessageSchema = new mongoose.Schema(
  {
    organization: { type: ObjectId, ref: 'Organization', required: true, index: true },
    patient: { type: ObjectId, ref: 'PatientRecord', required: true, index: true },
    sender: { type: String, enum: ['patient', 'staff'], required: true },
    senderUser: { type: ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    readByPatient: { type: Boolean, default: false },
    readByStaff: { type: Boolean, default: false },
  },
  { timestamps: true }
);

hospitalMessageSchema.index({ patient: 1, createdAt: 1 });

export default mongoose.model('HospitalMessage', hospitalMessageSchema);