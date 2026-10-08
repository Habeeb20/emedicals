// Run once:  node scripts/seedSuperAdmin.js
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const FULL_NAME = process.env.SUPERADMIN_NAME || 'emedicals admin';
const EMAIL = (process.env.SUPERADMIN_EMAIL || 'emedicals@gmail.com').toLowerCase();
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'essential01';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    existing.role = 'super_admin';
    existing.isVerified = true;
    existing.isApproved = true;
    existing.isActive = true;
    await existing.save();
    console.log(`Existing user ${EMAIL} promoted to super_admin (password unchanged).`);
  } else {
    // password is hashed by the schema's pre('save') hook
    await User.create({
      fullName: FULL_NAME,
      email: EMAIL,
      password: PASSWORD,
      role: 'super_admin',
      isVerified: true,
      isApproved: true,
      isActive: true,
    });
    console.log(`Super admin created: ${EMAIL}`);
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Seeding failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});