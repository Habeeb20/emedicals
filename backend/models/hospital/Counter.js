import mongoose from 'mongoose';

// One counter per hospital per kind of number, e.g. "mrn:<hospitalId>" -> MRN-00001, MRN-00002...
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

const HospitalCounter = mongoose.model('HospitalCounter', counterSchema);

// $inc is atomic, so two people registering at the same moment never get the same number
export const nextNumber = async (key, prefix, pad = 5) => {
  const counter = await HospitalCounter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(counter.seq).padStart(pad, '0')}`;
};

export default HospitalCounter;