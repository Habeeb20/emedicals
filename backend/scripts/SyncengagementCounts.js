// Usage: node scripts/syncEngagementCounts.js
// Rebuilds likesCount / sharesCount on User and Organization from the Interaction collection,
// so both always agree. (viewsCount is NOT touched: views are counter-only and not stored as Interaction rows.)
import 'dotenv/config';
import mongoose from 'mongoose';
import Interaction from '../models/Interaction.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';

const MODELS = { User, Organization };
const FIELD = { like: 'likesCount', share: 'sharesCount' };

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

const rows = await Interaction.aggregate([
  { $match: { type: { $in: ['like', 'share'] } } },
  { $group: { _id: { targetType: '$targetType', target: '$target', type: '$type' }, n: { $sum: 1 } } },
]);

for (const [name, Model] of Object.entries(MODELS)) {
  await Model.updateMany({}, { $set: { likesCount: 0, sharesCount: 0 } });
  const ops = rows
    .filter((r) => r._id.targetType === name)
    .map((r) => ({ updateOne: { filter: { _id: r._id.target }, update: { $set: { [FIELD[r._id.type]]: r.n } } } }));
  if (ops.length) await Model.bulkWrite(ops);
  console.log(`${name}: updated ${ops.length} counters`);
}
await mongoose.disconnect();