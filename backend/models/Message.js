// import mongoose from 'mongoose';
// import Conversation from './Conversation.js';

// const attachmentSchema = new mongoose.Schema(
//   {
//     url: { type: String, required: true },
//     publicId: String,
//     name: String,
//     mimeType: String,
//     size: Number,   // bytes
//   },
//   { _id: false }
// );

// const messageSchema = new mongoose.Schema(
//   {
//     conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
//     sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     type: { type: String, enum: ['text', 'image', 'file', 'audio', 'video', 'system'], default: 'text' },
//     text: { type: String, trim: true, maxlength: 5000 },
//     attachments: [attachmentSchema],
//     replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

//     deliveredTo: [{ _id: false, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date }],
//     readBy: [{ _id: false, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date }],

//     isEdited: { type: Boolean, default: false },
//     editedAt: Date,
//     deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],   // "delete for me"
//     isDeletedForEveryone: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// messageSchema.index({ conversation: 1, createdAt: -1 });

// // A message must carry text or at least one attachment (system messages need text)
// messageSchema.pre('validate', function (next) {
//   if (!this.text && (!this.attachments || this.attachments.length === 0)) {
//     return next(new Error('Message must have text or an attachment'));
//   }
//   next();
// });

// const previewOf = (msg) =>
//   msg.text ? msg.text.slice(0, 80) : msg.type === 'image' ? '📷 Photo' : '📎 Attachment';

// // Send a message (checks membership, updates the conversation's inbox preview)
// messageSchema.statics.send = async function ({ conversationId, senderId, text, type, attachments, replyTo }) {
//   const convo = await Conversation.findById(conversationId);
//   if (!convo || !convo.isActive) throw new Error('Conversation not found');
//   if (!convo.hasParticipant(senderId)) throw new Error('You are not part of this conversation');

//   const message = await this.create({
//     conversation: conversationId,
//     sender: senderId,
//     type: type || (attachments?.length ? 'file' : 'text'),
//     text,
//     attachments,
//     replyTo,
//     readBy: [{ user: senderId, at: new Date() }],
//   });

//   await Conversation.findByIdAndUpdate(conversationId, {
//     lastMessage: message._id,
//     lastMessageAt: message.createdAt,
//     lastMessagePreview: previewOf(message),
//   });

//   return message;
// };

// // Mark everything in a conversation as read for a user
// messageSchema.statics.markConversationRead = async function (conversationId, userId) {
//   const now = new Date();
//   await Conversation.updateOne(
//     { _id: conversationId, 'participants.user': userId },
//     { $set: { 'participants.$.lastReadAt': now } }
//   );
//   await this.updateMany(
//     { conversation: conversationId, sender: { $ne: userId }, 'readBy.user': { $ne: userId } },
//     { $push: { readBy: { user: userId, at: now } } }
//   );
// };

// // Unread count for one user in one conversation
// messageSchema.statics.unreadCount = async function (conversationId, userId) {
//   const convo = await Conversation.findById(conversationId, { participants: { $elemMatch: { user: userId } } });
//   const lastReadAt = convo?.participants?.[0]?.lastReadAt || new Date(0);
//   return this.countDocuments({
//     conversation: conversationId,
//     sender: { $ne: userId },
//     createdAt: { $gt: lastReadAt },
//     deletedFor: { $ne: userId },
//     isDeletedForEveryone: false,
//   });
// };

// export default mongoose.model('Message', messageSchema);



















