import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['User', 'Organization'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetType', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, trim: true, maxlength: 2000 },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    isVerifiedVisit: { type: Boolean, default: false },   // true when tied to a completed appointment/order
    isHidden: { type: Boolean, default: false },          // moderation
    reply: {                                              // doctor / organization response
      text: String,
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      repliedAt: Date,
    },
  },
  { timestamps: true }
);

// One review per reviewer per target
reviewSchema.index({ reviewer: 1, targetType: 1, target: 1 }, { unique: true });

// Recalculate denormalized rating on the target
reviewSchema.statics.calcRatings = async function (targetType, targetId) {
  const [stats] = await this.aggregate([
    { $match: { targetType, target: new mongoose.Types.ObjectId(targetId), isHidden: false } },
    { $group: { _id: '$target', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await mongoose.model(targetType).findByIdAndUpdate(targetId, {
    ratingAverage: stats ? Math.round(stats.avg * 10) / 10 : 0,
    ratingCount: stats ? stats.count : 0,
  });
};

reviewSchema.post('save', function () {
  this.constructor.calcRatings(this.targetType, this.target);
});

// Covers findByIdAndUpdate / findOneAndUpdate (edits, hide) and findByIdAndDelete / findOneAndDelete
['findOneAndUpdate', 'findOneAndDelete'].forEach((hook) => {
  reviewSchema.post(hook, function (doc) {
    if (doc) doc.constructor.calcRatings(doc.targetType, doc.target);
  });
});

export default mongoose.model('Review', reviewSchema);