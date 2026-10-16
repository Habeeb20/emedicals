import mongoose from 'mongoose';
import { vitalsSchema } from './vitalsSchema.js';

const { ObjectId } = mongoose.Schema.Types;

// One outpatient visit: arrives -> vitals taken -> doctor consults -> completed.
const visitSchema = new mongoose.Schema(
  {
    organization: { type: ObjectId, ref: 'Organization', required: true, index: true },
    patient: { type: ObjectId, ref: 'PatientRecord', required: true, index: true },
    doctor: { type: ObjectId, ref: 'User' }, // set when a doctor starts the consultation
    visitNumber: String,
    type: { type: String, enum: ['opd', 'emergency', 'follow_up'], default: 'opd' },
    priority: { type: String, enum: ['normal', 'urgent', 'emergency'], default: 'normal' },
    queueRank: { type: Number, default: 2 }, // 0 emergency, 1 urgent, 2 normal: lower is seen first
    complaint: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['waiting', 'triaged', 'in_consultation', 'completed', 'cancelled'],
      default: 'waiting',
      index: true,
    },
    vitals: vitalsSchema,
    history: String,
    examination: String,
    diagnosis: String,
    treatmentPlan: String,
    notes: String,
    followUpDate: Date,
    startedAt: Date,
    completedAt: Date,
    createdBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

visitSchema.index({ organization: 1, status: 1, queueRank: 1, createdAt: 1 });

export default mongoose.model('Visit', visitSchema);