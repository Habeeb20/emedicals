import mongoose from 'mongoose';

const cemeteryPlotSchema = new mongoose.Schema(
  {
    cemetery: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    section: String,
    plotNumber: { type: String, required: true },
    type: { type: String, enum: ['single', 'double', 'family', 'vault'], default: 'single' },
    price: Number,
    status: { type: String, enum: ['available', 'reserved', 'occupied'], default: 'available', index: true },
    reservedBy: { name: String, phone: String },
  },
  { timestamps: true }
);

cemeteryPlotSchema.index({ cemetery: 1, plotNumber: 1 }, { unique: true });

export default mongoose.model('CemeteryPlot', cemeteryPlotSchema);