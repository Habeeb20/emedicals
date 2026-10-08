import mongoose from 'mongoose';

// Catalog of tests a lab offers
const labTestSchema = new mongoose.Schema(
  {
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    code: String,
    category: String,                 // hematology, microbiology, etc.
    price: { type: Number, required: true },
    sampleType: String,               // blood, urine, stool...
    turnaroundHours: Number,
    referenceRange: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

labTestSchema.index({ lab: 1, name: 1 }, { unique: true });

export default mongoose.model('LabTest', labTestSchema);