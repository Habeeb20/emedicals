import mongoose from 'mongoose';
const { Schema } = mongoose;

const walletSchema = new Schema(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, credits: { type: Number, default: 0, min: 0 } },
  { timestamps: true }
);

const requestSchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    department: { type: String, required: true, index: true },
    message: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'accepted', 'closed', 'expired'], default: 'open', index: true },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    chatRoom: { type: Schema.Types.ObjectId, ref: 'ChatRoom' },
    expiresAt: { type: Date, index: true },
    creditRefunded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const QuickChatWallet = mongoose.model('QuickChatWallet', walletSchema);
export const QuickChatRequest = mongoose.model('QuickChatRequest', requestSchema);