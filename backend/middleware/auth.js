import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const unauthorized = (res, message, extra = {}) =>
  res.status(401).json({ success: false, message, ...extra });

/**
 * Verifies the Bearer token and attaches the user to the request.
 * Sets: req.user (full user document, without password) and req.userId
 */
export const verifyToken = async (req, res, next) => {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return unauthorized(res, 'Access token required');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // 401 (not 403) so the frontend knows to send the user back to login
      return err.name === 'TokenExpiredError'
        ? unauthorized(res, 'Session expired. Please log in again.', { code: 'TOKEN_EXPIRED' })
        : unauthorized(res, 'Invalid token');
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return unauthorized(res, 'User no longer exists');

    // Checked on every request, so deactivating or un-approving a user cuts them off immediately
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }
    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: 'Your account is awaiting admin approval' });
    }

    req.user = user;
    req.userId = user._id;
    return next();
  } catch (error) {
    return next(error);   // real server/DB errors stay 500s instead of looking like a bad token
  }
};
export const protect = async (req, res, next) => {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return unauthorized(res, 'Access token required');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // 401 (not 403) so the frontend knows to send the user back to login
      return err.name === 'TokenExpiredError'
        ? unauthorized(res, 'Session expired. Please log in again.', { code: 'TOKEN_EXPIRED' })
        : unauthorized(res, 'Invalid token');
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return unauthorized(res, 'User no longer exists');

    // Checked on every request, so deactivating or un-approving a user cuts them off immediately
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated' });
    }
    if (!user.isApproved) {
      return res.status(403).json({ success: false, message: 'Your account is awaiting admin approval' });
    }

    req.user = user;
    req.userId = user._id;
    return next();
  } catch (error) {
    return next(error);   // real server/DB errors stay 500s instead of looking like a bad token
  }
};

/**
 * Role-based access. Use after verifyToken:
 *   router.get('/labs', verifyToken, authorize('lab_tech', 'hospital_admin'), handler)
 * super_admin always passes.
 */
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res, 'Access token required');
  if (req.user.role !== 'super_admin' && !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to do this' });
  }
  return next();
};
export const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res, 'Access token required');
  if (req.user.role !== 'super_admin' && !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to do this' });
  }
  return next();
};







export const optionalAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
    if (!token) return next();

    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (user?.isActive) req.user = user;
  } catch {
    // Expired or invalid token: treat the visitor as a guest instead of failing the request
  }
  next();
};