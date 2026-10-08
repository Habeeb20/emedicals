import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', required: true },
    testName: String,                 // snapshot, in case the catalog changes
    price: Number,
    result: String,
    unit: String,
    referenceRange: String,
    flag: { type: String, enum: ['normal', 'low', 'high', 'critical'] },
    resultAttachment: { url: String, publicId: String },
  },
  { _id: true }
);

const labOrderSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // doctor, optional for walk-ins
    lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    orderNumber: { type: String, unique: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    status: {
      type: String,
      enum: ['ordered', 'sample_collected', 'processing', 'completed', 'cancelled'],
      default: 'ordered',
      index: true,
    },
    totalAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    collectedAt: Date,
    completedAt: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('LabOrder', labOrderSchema);