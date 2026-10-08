import mongoose from 'mongoose';
const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: String,
    body: String,
    data: Schema.Types.Mixed,
    readAt: Date,
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);