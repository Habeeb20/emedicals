// Role gates for the hospital routes. Run AFTER your normal `protect` middleware (it must set req.user).
//   router.get('/patients', hospitalStaff('doctor', 'nurse'), listPatients)
// For staff, req.orgId is the hospital they belong to. Every query is scoped by it,
// so one hospital can never read another hospital's data.

const deny = (res, status, message) => res.status(status).json({ success: false, message });

export const hospitalStaff = (...roles) => (req, res, next) => {
  const user = req.user;
  if (!user || !roles.includes(user.role)) return deny(res, 403, 'You do not have access to this');
  if (user.isApproved === false) return deny(res, 403, 'Your account is waiting for approval');
  if (user.isActive === false) return deny(res, 403, 'Your account is inactive');
  if (!user.organization) return deny(res, 400, 'Your account is not linked to a hospital');
  req.orgId = user.organization._id ?? user.organization;
  next();
};

export const patientOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'patient') return deny(res, 403, 'This page is for patients');
  next();
};