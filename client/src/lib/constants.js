export const ROLES = ['patient', 'doctor', 'nurse', 'lab_tech', 'pharmacist', 'hospital_admin', 'mortuary_officer', 'cemetery_officer'];
export const ORG_TYPES = ['hospital', 'clinic', 'lab', 'pharmacy', 'mortuary', 'cemetery'];

export const label = (s = '') => s.replace(/_/g, ' ');
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// Full class names only (Tailwind can't see dynamically built ones)
export const ROLE_TONE = {
  patient: 'gray', doctor: 'primary', nurse: 'info', lab_tech: 'lab', pharmacist: 'pharmacy',
  hospital_admin: 'primary', mortuary_officer: 'memorial', cemetery_officer: 'memorial', super_admin: 'navy',
};
export const ROLE_BAR = {
  patient: 'bg-gray-400', doctor: 'bg-primary-500', nurse: 'bg-info', lab_tech: 'bg-lab-500', pharmacist: 'bg-pharmacy-500',
  hospital_admin: 'bg-primary-700', mortuary_officer: 'bg-memorial-500', cemetery_officer: 'bg-memorial-700',
};
export const ORG_TONE = {
  hospital: 'primary', clinic: 'primary', lab: 'lab', pharmacy: 'pharmacy', mortuary: 'memorial', cemetery: 'memorial',
};
export const STATUS_TONE = { approved: 'success', pending: 'warning', suspended: 'danger' };