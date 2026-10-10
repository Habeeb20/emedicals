

// import mongoose from 'mongoose';
// const { Schema } = mongoose;

// const chatRoomSchema = new Schema(
//   {
//     type: { type: String, enum: ['appointment', 'quick'], required: true },
//     appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
//     quickChat: { type: Schema.Types.ObjectId, ref: 'QuickChatRequest' },
//     participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
//     isClosed: { type: Boolean, default: false },
//     lastMessageAt: Date,
//   },
//   { timestamps: true }
// );

// const messageSchema = new Schema(
//   {
//     room: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
//     sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//     text: { type: String, trim: true, maxlength: 4000 },
//     attachment: { url: String, name: String, mime: String },
//     readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
//   },
//   { timestamps: true }
// );
// messageSchema.index({ room: 1, createdAt: -1 });

// export const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
// export const Message = mongoose.model('Message', messageSchema);









import mongoose from 'mongoose';
const { Schema } = mongoose;

const chatRoomSchema = new Schema(
  {
    type: { type: String, enum: ['appointment', 'quick', 'pharmacy'], required: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    quickChat: { type: Schema.Types.ObjectId, ref: 'QuickChatRequest' },
    // Pharmacy chats: one room per patient + pharmacy. Any staff of that pharmacy can reply.
    pharmacy: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    patient: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionExpiresAt: Date, // the patient can send until this time; renewed by using a chat pass
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    isClosed: { type: Boolean, default: false },
    lastMessageAt: Date,
  },
  { timestamps: true }
);

// One pharmacy chat per patient + pharmacy (also makes concurrent "start chat" taps safe)
chatRoomSchema.index(
  { patient: 1, pharmacy: 1 },
  { unique: true, partialFilterExpression: { type: 'pharmacy' } }
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