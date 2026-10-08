import mongoose from 'mongoose';

// Likes, shares and views for User (e.g. doctors) and Organization (e.g. hospitals, labs)
const interactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },   // optional for guest views/shares
    type: { type: String, enum: ['like', 'share', 'view'], required: true },
    targetType: { type: String, enum: ['User', 'Organization'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetType', required: true, index: true },
    channel: { type: String, enum: ['whatsapp', 'facebook', 'x', 'email', 'copy_link', 'other'] }, // shares only
  },
  { timestamps: true }
);

// A user can like a target only once
interactionSchema.index(
  { user: 1, targetType: 1, target: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'like' } }
);

const counterField = { like: 'likesCount', share: 'sharesCount', view: 'viewsCount' };

const bump = (targetType, targetId, type, by) =>
  mongoose.model(targetType).findByIdAndUpdate(targetId, { $inc: { [counterField[type]]: by } });

// Toggle like. Returns { liked: boolean }
interactionSchema.statics.toggleLike = async function (userId, targetType, targetId) {
  const existing = await this.findOneAndDelete({ user: userId, targetType, target: targetId, type: 'like' });
  if (existing) {
    await bump(targetType, targetId, 'like', -1);
    return { liked: false };
  }
  await this.create({ user: userId, targetType, target: targetId, type: 'like' });
  await bump(targetType, targetId, 'like', 1);
  return { liked: true };
};

interactionSchema.statics.recordShare = async function (userId, targetType, targetId, channel = 'other') {
  await this.create({ user: userId, targetType, target: targetId, type: 'share', channel });
  await bump(targetType, targetId, 'share', 1);
};

// Views are counter-only by default (cheap). Dedupe per user/IP in the controller if needed.
interactionSchema.statics.recordView = (targetType, targetId) => bump(targetType, targetId, 'view', 1);

export default mongoose.model('Interaction', interactionSchema);