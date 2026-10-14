import mongoose from 'mongoose';

const { Schema } = mongoose;
const oid = (ref, extra = {}) => ({ type: Schema.Types.ObjectId, ref, ...extra });

export const DRUG_FORMS = [
  'tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream',
  'ointment', 'drops', 'inhaler', 'suppository', 'powder', 'other',
];
export const SCHEDULES = ['otc', 'prescription_only', 'controlled'];
export const PAY_METHODS = ['cash', 'card', 'transfer', 'insurance', 'credit'];

/* ------------------------------------------------------------------ */
/* DRUG CATALOG (one catalog per pharmacy organization)                */
/* ------------------------------------------------------------------ */
const drugSchema = new Schema(
  {
    pharmacy: oid('Organization', { required: true, index: true }),
    genericName: { type: String, required: true, trim: true },
    brandName: { type: String, trim: true },
    strength: { type: String, trim: true },              // "500mg"
    form: { type: String, enum: DRUG_FORMS, default: 'tablet' },
    route: { type: String, trim: true },                 // oral, topical, IV...
    packSize: { type: String, trim: true },              // "10 x 10"
    unit: { type: String, trim: true, default: 'unit' }, // what one unit of stock is: tablet, bottle, vial
    category: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    barcode: { type: String, trim: true },
    nafdacNumber: { type: String, trim: true },
    schedule: { type: String, enum: SCHEDULES, default: 'prescription_only' },
    coldChain: { type: Boolean, default: false },
    highAlert: { type: Boolean, default: false },
    sellingPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },     // latest received cost
    reorderLevel: { type: Number, default: 10, min: 0 },
    maxStock: { type: Number, min: 0 },
    // Denormalised on-hand total (all batches, expired included). The ledger is the source of truth.
    stock: { type: Number, default: 0, min: 0 },
    lastReceivedAt: Date, // set when stock is first/last received

        images: { type: [String], default: [] },   // Cloudinary secure URLs
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
drugSchema.index({ pharmacy: 1, genericName: 1, brandName: 1 });
drugSchema.index(
  { pharmacy: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string' } } }
);
export const Drug = mongoose.model('Drug', drugSchema);

/* ------------------------------------------------------------------ */
/* BATCH: stock is tracked per batch with its own expiry               */
/* ------------------------------------------------------------------ */
const batchSchema = new Schema(
  {
    pharmacy: oid('Organization', { required: true, index: true }),
    drug: oid('Drug', { required: true }),
    batchNo: { type: String, required: true, trim: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, default: 0, min: 0 },        // sellable on hand
    quarantinedQty: { type: Number, default: 0, min: 0 },  // returned stock awaiting a decision
    receivedQty: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    supplier: oid('Supplier'),
    receivedAt: Date,
  },
  { timestamps: true }
);
batchSchema.index({ pharmacy: 1, drug: 1, batchNo: 1 }, { unique: true });
batchSchema.index({ drug: 1, expiryDate: 1 });
export const Batch = mongoose.model('Batch', batchSchema);

/* ------------------------------------------------------------------ */
/* STOCK LEDGER: every change is a row, nothing is overwritten         */
/* ------------------------------------------------------------------ */
export const MOVEMENT_TYPES = [
  'receipt', 'sale', 'adjustment', 'writeoff',
  'return_quarantine', 'quarantine_release', 'quarantine_writeoff',
];
const movementSchema = new Schema(
  {
    pharmacy: oid('Organization', { required: true, index: true }),
    drug: oid('Drug', { required: true }),
    batch: oid('Batch'),
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    quantity: { type: Number, required: true },   // signed
    balanceAfter: { type: Number, required: true }, // drug on-hand after this row
    unitCost: Number,
    reason: String,
    ref: { model: String, id: Schema.Types.ObjectId },
    by: oid('User'),
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
movementSchema.index({ drug: 1, createdAt: -1 });
export const StockMovement = mongoose.model('StockMovement', movementSchema);

/* ------------------------------------------------------------------ */
/* SUPPLIERS + GOODS RECEIVED                                          */
/* ------------------------------------------------------------------ */
const supplierSchema = new Schema(
  {
    pharmacy: oid('Organization', { required: true, index: true }),
    name: { type: String, required: true, trim: true },
    contactPerson: String,
    phone: String,
    email: { type: String, lowercase: true, trim: true },
    address: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Supplier = mongoose.model('Supplier', supplierSchema);

const receiptItemSchema = new Schema(
  {
    drug: oid('Drug', { required: true }),
    name: String,
    batchNo: String,
    expiryDate: Date,
    quantity: Number,
    costPrice: Number,
  },
  { _id: false }
);
const goodsReceiptSchema = new Schema(
  {
    pharmacy: oid('Organization', { required: true, index: true }),
    supplier: oid('Supplier'),
    invoiceNo: String,
    notes: String,
    items: [receiptItemSchema],
    totalCost: Number,
    receivedBy: oid('User'),
  },
  { timestamps: true }
);
goodsReceiptSchema.index({ pharmacy: 1, createdAt: -1 });
export const GoodsReceipt = mongoose.model('GoodsReceipt', goodsReceiptSchema);

/* ------------------------------------------------------------------ */
/* SALES (prescription dispensing and walk-in sales share one model)   */
/* ------------------------------------------------------------------ */
const saleBatchSchema = new Schema(
  {
    batch: oid('Batch'),
    batchNo: String,
    expiryDate: Date,
    quantity: Number,
    costPrice: Number,
    returned: { type: Number, default: 0 },
  },
  { _id: false }
);
const saleItemSchema = new Schema(
  {
    drug: oid('Drug', { required: true }),
    name: String,
    schedule: String,
    batches: [saleBatchSchema],
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: Number,
    returnedQty: { type: Number, default: 0 },
    rxItemIndex: Number,
  },
  { _id: false }
);
const returnSchema = new Schema(
  {
    items: [{ itemIndex: Number, quantity: Number, _id: false }],
    amount: Number,
    reason: String,
    by: oid('User'),
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);
const saleSchema = new Schema(
  {
    pharmacy: oid('Organization', { required: true, index: true }),
    receiptNo: { type: String, unique: true },
    type: { type: String, enum: ['prescription', 'walk_in', 'online'], required: true },

    prescription: oid('Prescription'),
    patient: oid('User', { index: true }),
    customerName: String,
    customerPhone: String,
    externalRx: { prescriber: String, note: String },
    soldBy: oid('User'),
    items: [saleItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: PAY_METHODS, required: true },
    amountPaid: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid', 'claim_pending'], default: 'paid' },
    insurer: String,
    authCode: String,
    status: { type: String, enum: ['completed', 'partially_refunded', 'refunded'], default: 'completed' },
    refundedTotal: { type: Number, default: 0 },
    returns: [returnSchema],
    notes: String,
  },
  { timestamps: true }
);
saleSchema.index({ pharmacy: 1, createdAt: -1 });
saleSchema.index({ pharmacy: 1, patient: 1, createdAt: -1 });
saleSchema.index({ prescription: 1 });
export const Sale = mongoose.model('Sale', saleSchema);

/* ------------------------------------------------------------------ */
/* AUDIT LOG                                                           */
/* ------------------------------------------------------------------ */
const auditSchema = new Schema(
  {
    pharmacy: oid('Organization', { required: true, index: true }),
    user: oid('User'),
    action: { type: String, required: true },
    entity: String,
    entityId: Schema.Types.ObjectId,
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditSchema.index({ pharmacy: 1, createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', auditSchema);