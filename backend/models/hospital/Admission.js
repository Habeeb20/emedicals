import mongoose from 'mongoose';
import { vitalsSchema } from './vitalsSchema.js';

const { ObjectId } = mongoose.Schema.Types;

// Every time the patient sits in a bed. A transfer closes one stay and opens the next,
// so the bill can use the right ward rate for each period.
const staySchema = new mongoose.Schema(
  {
    bed: { type: ObjectId, ref: 'Bed' },
    bedLabel: String,
    wardName: String,
    dailyRate: { type: Number, default: 0 },
    from: { type: Date, default: Date.now },
    to: Date,
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['nursing', 'doctor'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const admissionSchema = new mongoose.Schema(
  {
    organization: { type: ObjectId, ref: 'Organization', required: true, index: true },
    patient: { type: ObjectId, ref: 'PatientRecord', required: true, index: true },
    doctor: { type: ObjectId, ref: 'User' },
    admittedBy: { type: ObjectId, ref: 'User' },
    visit: { type: ObjectId, ref: 'Visit' },
    bed: { type: ObjectId, ref: 'Bed' }, // current bed
    ward: { type: ObjectId, ref: 'Ward' }, // current ward
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['admitted', 'discharged'], default: 'admitted', index: true },
    admittedAt: { type: Date, default: Date.now },
    dischargedAt: Date,
    stays: [staySchema],
    vitals: [vitalsSchema],
    notes: [noteSchema],
    dischargeSummary: String,
    dischargeInstructions: String,
    followUpDate: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Admission', admissionSchema);