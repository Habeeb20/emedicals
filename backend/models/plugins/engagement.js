// Adds public engagement counters to any schema (User, Organization, ...).
// Counters are denormalized for fast listing/sorting; the source of truth is
// the Interaction model (likes, shares, views) and the Review model (ratings).
export default function engagementPlugin(schema) {
  schema.add({
    likesCount: { type: Number, default: 0, min: 0 },
    viewsCount: { type: Number, default: 0, min: 0 },
    sharesCount: { type: Number, default: 0, min: 0 },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  });

  schema.index({ ratingAverage: -1, ratingCount: -1 });
}