

import mongoose from 'mongoose';
const { Schema } = mongoose;

const chatRoomSchema = new Schema(
  {
    type: { type: String, enum: ['appointment', 'quick'], required: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    quickChat: { type: Schema.Types.ObjectId, ref: 'QuickChatRequest' },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    isClosed: { type: Boolean, default: false },
    lastMessageAt: Date,
  },
  { timestamps: true }
);

const messageSchema = new Schema(
  {
    room: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true, maxlength: 4000 },
    attachment: { url: String, name: String, mime: String },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);
messageSchema.index({ room: 1, createdAt: -1 });

export const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
export const Message = mongoose.model('Message', messageSchema);