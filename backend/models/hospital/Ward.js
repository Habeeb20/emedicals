import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

export const WARD_TYPES = ['general', 'private', 'icu', 'maternity', 'pediatric', 'emergency'];

const wardSchema = new mongoose.Schema(
  {
    organization: { type: ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: WARD_TYPES, default: 'general' },
    dailyRate: { type: Number, default: 0, min: 0 }, // bed charge per day
  },
  { timestamps: true }
);

const bedSchema = new mongoose.Schema(
  {
    organization: { type: ObjectId, ref: 'Organization', required: true, index: true },
    ward: { type: ObjectId, ref: 'Ward', required: true, index: true },
    label: { type: String, required: true, trim: true }, // "GEN-1"
    status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
    admission: { type: ObjectId, ref: 'Admission', default: null }, // who is in the bed right now
  },
  { timestamps: true }
);

bedSchema.index({ ward: 1, label: 1 }, { unique: true });

export const Ward = mongoose.model('Ward', wardSchema);
export const Bed = mongoose.model('Bed', bedSchema);