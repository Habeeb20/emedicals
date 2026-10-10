// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';
// import engagementPlugin from "./plugins/engagement.js"


// export const ROLES = [
//   'patient', 'doctor', 'nurse', 'lab_tech', 'pharmacist',
//   'hospital_admin', 'mortuary_officer', 'cemetery_officer', 'super_admin',
// ];

// const userSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true, trim: true },
//     email: { type: String, required: true, unique: true, lowercase: true, trim: true },
//     phone: { type: String, unique: true, sparse: true },
//     password: { type: String, required: true, minlength: 8, select: false },
//     role: { type: String, enum: ROLES, default: 'patient', index: true },
//     organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
//     gender: { type: String, enum: ['male', 'female', 'other'] },
//     dateOfBirth: Date,
//     profilePicture:{type:String},
//     avatar: { url: String, publicId: String },
//     isVerified: { type: Boolean, default: false },   // email/phone verified
//     isApproved: { type: Boolean, default: true },    // set false for staff roles until admin approves
//     isActive: { type: Boolean, default: true },
//     state: String,                         // slug or name from the location API, e.g. "lagos"
//     lga: String,
// address: String,
// coordinates: { lat: Number, lng: Number },   // filled from GPS or geocoded from address
// prescriptionPublic: { type: Boolean, default: false },
//     otp: {
//       codeHash: { type: String, select: false },
//       expiresAt: { type: Date, select: false },
//       attempts: { type: Number, default: 0, select: false },
//       lastSentAt: { type: Date, select: false },
//     },
//     lastLoginAt: Date,
//   },
//   { timestamps: true }
// );

// userSchema.plugin(engagementPlugin);

// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return;
//   this.password = await bcrypt.hash(this.password, 12);
  
// });

// userSchema.methods.comparePassword = function (plain) {
//   return bcrypt.compare(plain, this.password);
// };

// userSchema.set('toJSON', {
//   transform: (_doc, ret) => { delete ret.password; delete ret.otp; delete ret.__v; return ret; },
// });

// export default mongoose.model('User', userSchema);






























import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import engagementPlugin from './plugins/engagement.js';

const { Schema } = mongoose;

export const ROLES = [
  'patient', 'doctor', 'nurse', 'lab_tech', 'pharmacist',
  'hospital_admin', 'mortuary_officer', 'cemetery_officer', 'super_admin',
];

// Roles that can be liked / reviewed / shared as a person
export const REVIEWABLE_ROLES = ['doctor', 'nurse', 'lab_tech', 'pharmacist'];

/* ------------------------------------------------------------------ */
/* LOYALTY CONFIG: what earns points                                   */
/* ------------------------------------------------------------------ */
// points   : awarded per successful action
// dailyCap : max awards of this action per user per UTC day (optional)
// Every award is idempotent per (user, action, refId), so un-like/re-like,
// delete/re-create review, etc. can never be farmed.
export const LOYALTY_RULES = {
  EMAIL_VERIFIED:        { points: 10,  label: 'Verify your email/phone' },
  PROFILE_COMPLETED:     { points: 30,  label: 'Complete your profile' },
  APPOINTMENT_COMPLETED: { points: 50,  label: 'Complete an appointment', dailyCap: 3 },
  REVIEW_VERIFIED:       { points: 20,  label: 'Review a provider you visited' },
  REVIEW:                { points: 5,   label: 'Review a provider (no visit on record)' },
  LIKE:                  { points: 1,   label: 'Like a doctor/organization', dailyCap: 10 },
  SHARE:                 { points: 2,   label: 'Share a doctor/organization', dailyCap: 5 },
  REFERRAL:              { points: 100, label: 'Refer a friend who signs up' },
};

export const TIERS = [
  { name: 'bronze',   min: 0 },
  { name: 'silver',   min: 300 },
  { name: 'gold',     min: 1000 },
  { name: 'platinum', min: 2500 },
];

export const tierFor = (lifetimePoints = 0) =>
  [...TIERS].reverse().find((t) => lifetimePoints >= t.min).name;

/* ------------------------------------------------------------------ */
/* USER                                                                */
/* ------------------------------------------------------------------ */
const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'patient', index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: Date,
    profilePicture: { type: String },
    avatar: { url: String, publicId: String },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    state: String,
    lga: String,
    address: String,
    coordinates: { lat: Number, lng: Number },
    prescriptionPublic: { type: Boolean, default: false },
    otp: {
      codeHash: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      attempts: { type: Number, default: 0, select: false },
      lastSentAt: { type: Date, select: false },
    },
    lastLoginAt: Date,

    // ---- Loyalty ----
    loyalty: {
      points: { type: Number, default: 0, min: 0 },          // spendable balance
      lifetimePoints: { type: Number, default: 0, min: 0 },  // never decreases; drives tier
      tier: { type: String, enum: TIERS.map((t) => t.name), default: 'bronze' },
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(4).toString('hex').toUpperCase(),
    },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Adds likesCount, sharesCount, viewsCount, ratingAverage, ratingCount (assumed)
userSchema.plugin(engagementPlugin);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Reviews received by this user (doctor/nurse/etc.): User.findById(id).populate('reviews')
userSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'target',
  match: { targetType: 'User', isHidden: false },
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.otp;
    delete ret.__v;
    return ret;
  },
});

/* ---- Loyalty statics ---- */

// Award points for an action. Safe to call repeatedly: duplicates are ignored.
// refId = the thing the action was about (target id, appointment id, new user id...)
userSchema.statics.awardPoints = async function (userId, action, refId = '') {
  const rule = LOYALTY_RULES[action];
  if (!rule) throw new Error(`Unknown loyalty action: ${action}`);

  if (rule.dailyCap) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const today = await LoyaltyTransaction.countDocuments({
      user: userId, action, createdAt: { $gte: start },
    });
    if (today >= rule.dailyCap) return { awarded: 0, reason: 'daily_cap' };
  }

  try {
    await LoyaltyTransaction.create({
      user: userId, action, points: rule.points, key: `${action}:${refId}`,
    });
  } catch (err) {
    if (err.code === 11000) return { awarded: 0, reason: 'already_awarded' };
    throw err;
  }

  const user = await this.findByIdAndUpdate(
    userId,
    { $inc: { 'loyalty.points': rule.points, 'loyalty.lifetimePoints': rule.points } },
    { new: true }
  ).select('loyalty');
  if (!user) return { awarded: 0, reason: 'user_not_found' };

  const tier = tierFor(user.loyalty.lifetimePoints);
  const tierUp = tier !== user.loyalty.tier;
  if (tierUp) await this.updateOne({ _id: userId }, { $set: { 'loyalty.tier': tier } });

  return { awarded: rule.points, balance: user.loyalty.points, tier, tierUp };
};

// Spend points (rewards, discounts). Atomic: fails if balance is too low.
userSchema.statics.redeemPoints = async function (userId, points, note = '') {
  if (!Number.isInteger(points) || points <= 0) throw new Error('Invalid points amount');
  const user = await this.findOneAndUpdate(
    { _id: userId, 'loyalty.points': { $gte: points } },
    { $inc: { 'loyalty.points': -points } },
    { new: true }
  ).select('loyalty');
  if (!user) throw new Error('Insufficient points');
  await LoyaltyTransaction.create({
    user: userId, action: 'REDEEM', points: -points,
    key: `REDEEM:${new mongoose.Types.ObjectId()}`, note,
  });
  return user.loyalty.points;
};

const User = mongoose.model('User', userSchema);
export default User;

/* ------------------------------------------------------------------ */
/* LOYALTY LEDGER (audit trail + idempotency)                          */
/* ------------------------------------------------------------------ */
const loyaltyTransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },   // key of LOYALTY_RULES, or 'REDEEM'
    points: { type: Number, required: true },   // + earned, - redeemed
    key: { type: String, required: true },      // `${action}:${refId}`
    note: String,
  },
  { timestamps: true }
);
loyaltyTransactionSchema.index({ user: 1, key: 1 }, { unique: true });
loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });

export const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);

/* ------------------------------------------------------------------ */
/* INTERACTION: likes, shares, views                                   */
/* ------------------------------------------------------------------ */
const interactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // optional for guest views
    type: { type: String, enum: ['like', 'share', 'view'], required: true },
    targetType: { type: String, enum: ['User', 'Organization'], required: true },
    target: { type: Schema.Types.ObjectId, refPath: 'targetType', required: true, index: true },
    channel: { type: String, enum: ['whatsapp', 'facebook', 'x', 'email', 'copy_link', 'other'] }, // shares only
    viewerKey: String, // views only: user id or hashed ip+UA
    day: String,       // views only: YYYY-MM-DD, one counted view per viewer per target per day
  },
  { timestamps: true }
);

// A user can like a target only once
interactionSchema.index(
  { user: 1, targetType: 1, target: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'like' } }
);
// One counted view per viewer per target per day
interactionSchema.index(
  { viewerKey: 1, targetType: 1, target: 1, day: 1 },
  { unique: true, partialFilterExpression: { type: 'view' } }
);
// View rows are only for dedupe: drop after 90 days
interactionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90, partialFilterExpression: { type: 'view' } }
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
  try {
    await this.create({ user: userId, targetType, target: targetId, type: 'like' });
  } catch (err) {
    if (err.code === 11000) return { liked: true }; // double-click race: already liked
    throw err;
  }
  await bump(targetType, targetId, 'like', 1);
  return { liked: true };
};

interactionSchema.statics.recordShare = async function (userId, targetType, targetId, channel = 'other') {
  await this.create({ user: userId, targetType, target: targetId, type: 'share', channel });
  await bump(targetType, targetId, 'share', 1);
};

// Returns { counted: boolean }. Same viewer + target + day counts once.
interactionSchema.statics.recordView = async function (targetType, targetId, viewerKey, userId) {
  const day = new Date().toISOString().slice(0, 10);
  try {
    await this.create({ user: userId, type: 'view', targetType, target: targetId, viewerKey, day });
  } catch (err) {
    if (err.code === 11000) return { counted: false };
    throw err;
  }
  await bump(targetType, targetId, 'view', 1);
  return { counted: true };
};

export const Interaction = mongoose.model('Interaction', interactionSchema);

/* ------------------------------------------------------------------ */
/* REVIEW                                                              */
/* ------------------------------------------------------------------ */
const reviewSchema = new Schema(
  {
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['User', 'Organization'], required: true },
    target: { type: Schema.Types.ObjectId, refPath: 'targetType', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120 },
    comment: { type: String, trim: true, maxlength: 2000 },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    isVerifiedVisit: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false }, // moderation
    reply: {
      text: String,
      repliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      repliedAt: Date,
    },
  },
  { timestamps: true }
);

// One review per reviewer per target
reviewSchema.index({ reviewer: 1, targetType: 1, target: 1 }, { unique: true });
reviewSchema.index({ targetType: 1, target: 1, isHidden: 1, createdAt: -1 });

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

export const Review = mongoose.model('Review', reviewSchema);

