import mongoose from 'mongoose';

const mortuaryRecordSchema = new mongoose.Schema(
  {
    mortuary: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    tagNumber: { type: String, required: true },
    deceased: {
      fullName: { type: String, required: true },
      gender: { type: String, enum: ['male', 'female', 'other'] },
      age: Number,
      dateOfBirth: Date,
      patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // link if they were a patient
    },
    dateOfDeath: { type: Date, required: true },
    placeOfDeath: String,
    causeOfDeath: String,
    certifyingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deathCertificateNumber: String,
    broughtInBy: { name: String, phone: String, relationship: String },
    nextOfKin: { name: String, phone: String, relationship: String, address: String },
    storage: { unit: String, slot: String },
    admittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['admitted', 'embalmed', 'released', 'buried'], default: 'admitted', index: true },
    released: { releasedTo: String, idPresented: String, releasedAt: Date, authorizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
    charges: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'part_paid', 'paid'], default: 'unpaid' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'MemorialBooking' },
  },
  { timestamps: true }
);

mortuaryRecordSchema.index({ mortuary: 1, tagNumber: 1 }, { unique: true });

export default mongoose.model('MortuaryRecord', mortuaryRecordSchema);