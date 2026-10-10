import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Pay-as-you-go pharmacy chat.
 * A "chat pass" opens a SESSION_HOURS conversation window with any pharmacy.
 * Messages inside an open window are free. Starting a new window uses one pass.
 * Change the plans below to change pricing (amounts are in naira).
 */
export const SESSION_HOURS = 24;
export const CHAT_PLANS = [
  { id: 'starter', name: 'Starter', passes: 3, price: 1500 },
  { id: 'standard', name: 'Standard', passes: 10, price: 4500, popular: true },
  { id: 'plus', name: 'Plus', passes: 25, price: 10000 },
];

const walletSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    passes: { type: Number, default: 0, min: 0 },
    totalPurchased: { type: Number, default: 0 },
    totalUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const ChatWallet = mongoose.model('ChatWallet', walletSchema);

const purchaseSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: String, required: true },
    passes: { type: Number, required: true },
    amount: { type: Number, required: true },            // naira
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paidAt: Date,
  },
  { timestamps: true }
);
export const ChatPurchase = mongoose.model('ChatPurchase', purchaseSchema);