import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },   // admin matters for groups
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: Date.now },   // unread count = messages newer than this
    isMuted: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    leftAt: Date,
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    // direct = 1-to-1 (patient<->doctor, doctor<->lab_tech, ...)
    // group  = staff teams, care teams, etc.
    // support = a user chatting with an organization (any approved staff of that org can answer)
    type: { type: String, enum: ['direct', 'group', 'support'], required: true, index: true },

    participants: {
      type: [participantSchema],
      validate: [(v) => v.length >= 1, 'A conversation needs at least one participant'],
    },

    // Direct chats only: sorted "idA_idB" so the same pair never gets two conversations
    directKey: { type: String, unique: true, sparse: true },

    // Group chats
    title: { type: String, trim: true },
    avatar: { url: String, publicId: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Support chats (user <-> organization)
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },

    // Optional link to what the chat is about (an appointment, lab order, prescription, ...)
    context: {
      model: { type: String, enum: ['Appointment', 'LabOrder', 'Prescription', 'MedicalRecord', 'MortuaryRecord', 'BurialRecord'] },
      ref: { type: mongoose.Schema.Types.ObjectId, refPath: 'context.model' },
    },

    // Denormalized for fast inbox lists
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: String,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

conversationSchema.index({ 'participants.user': 1, lastMessageAt: -1 });

const makeDirectKey = (a, b) => [String(a), String(b)].sort().join('_');

// Get the 1-to-1 conversation between two users, or create it
conversationSchema.statics.findOrCreateDirect = async function (userA, userB, context) {
  if (String(userA) === String(userB)) throw new Error('Cannot start a chat with yourself');
  const directKey = makeDirectKey(userA, userB);

  let convo = await this.findOne({ directKey });
  if (!convo) {
    convo = await this.create({
      type: 'direct',
      directKey,
      participants: [{ user: userA }, { user: userB }],
      ...(context && { context }),
    });
  }
  return convo;
};

// Inbox for a user, newest first
conversationSchema.statics.inboxFor = function (userId, { archived = false } = {}) {
  return this.find({
    participants: { $elemMatch: { user: userId, isArchived: archived, leftAt: { $exists: false } } },
    isActive: true,
  })
    .sort({ lastMessageAt: -1 })
    .populate('participants.user', 'fullName avatar role')
    .populate('organization', 'name logo type');
};

conversationSchema.methods.hasParticipant = function (userId) {
  return this.participants.some((p) => String(p.user) === String(userId) && !p.leftAt);
};

export default mongoose.model('Conversation', conversationSchema);