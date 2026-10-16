import mongoose from 'mongoose';

// One set of readings. Used on a visit (triage) and repeatedly on an admission (nursing chart).
export const vitalsSchema = new mongoose.Schema(
  {
    bloodPressure: String, // "120/80"
    temperature: Number, // °C
    pulse: Number, // beats per minute
    respiratoryRate: Number, // breaths per minute
    oxygenSaturation: Number, // SpO2 %
    weight: Number, // kg
    height: Number, // cm
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);