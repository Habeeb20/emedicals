import mongoose from 'mongoose';

const burialRecordSchema = new mongoose.Schema(
  {
    cemetery: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    plot: { type: mongoose.Schema.Types.ObjectId, ref: 'CemeteryPlot', required: true },
    mortuaryRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'MortuaryRecord' },
    deceasedName: { type: String, required: true },
    dateOfDeath: Date,
    burialDate: { type: Date, required: true },
    religion: String,                 // optional, as stated by the family
    nextOfKin: { name: String, phone: String, relationship: String },
    permitNumber: String,
    fee: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'part_paid', 'paid'], default: 'unpaid' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('BurialRecord', burialRecordSchema);