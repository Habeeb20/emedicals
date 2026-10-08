import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import * as c from '../controllers/superAdminController.js';

/**
 * Self-contained guard. If you already have `protect` / `restrictTo('super_admin')`
 * middleware, replace this with them. Assumes the JWT payload holds the user id as `id`
 * and is signed with process.env.JWT_SECRET — adjust to match your login controller.
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id || payload._id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Forbidden' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const router = Router();
router.use(requireSuperAdmin);

router.get('/stats', c.getStats);

router.get('/users', c.listUsers);
router.get('/users/:id', c.getUser);
router.put('/users/:id/approve', c.approveUser);
router.put('/users/:id/reject', c.rejectUser);
router.put('/users/:id/block', c.blockUser);
router.put('/users/:id/unblock', c.unblockUser);
router.put('/users/:id/role', c.changeRole);
router.delete('/users/:id', c.deleteUser);

router.get('/organizations', c.listOrganizations);
router.put('/organizations/:id/approve', c.approveOrganization);
router.put('/organizations/:id/suspend', c.suspendOrganization);
router.put('/organizations/:id/reinstate', c.reinstateOrganization);

export default router;

// In app.js:  import superAdminRoutes from './routes/superAdmin.routes.js';
//             app.use('/api/super-admin', superAdminRoutes);