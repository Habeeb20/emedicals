import mongoose from 'mongoose';

// Pharmacy inventory
const medicineSchema = new mongoose.Schema(
  {
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    genericName: String,
    brand: String,
    category: String,
    form: { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other'] },
    strength: String,
    price: { type: Number, required: true },
    stock: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10 },
    batchNumber: String,
    expiryDate: Date,
    requiresPrescription: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

medicineSchema.index({ pharmacy: 1, name: 1 });

export default mongoose.model('Medicine', medicineSchema);