import mongoose from 'mongoose';

// Shared profile for nurse, lab_tech, pharmacist, mortuary_officer, cemetery_officer
const staffProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    designation: String,
    department: String,
    licenseNumber: String,          // PCN, MLSCN, NMCN, etc.
    employeeId: String,
  },
  { timestamps: true }
);

export default mongoose.model('StaffProfile', staffProfileSchema);