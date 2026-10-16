import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  signup, login, requestEmailOtp, verifyOtp, getDashboard, getAllUsers,
  getMyReferral,
  agentSignup,
  getAgentStats,
  getAgentSignups
} from '../controllers/userController.js';
import { verifyToken, authorize } from '../middleware/auth.js';
import { getMyProfile, updateMyAvatar, updateMyProfile } from '../controllers/userController.js';
const router = Router();

// Brute-force verifyTokenion on the public auth endpoints (per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

// Public
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/request-otp', authLimiter, requestEmailOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.get("/", getAllUsers);

router.get('/me/referral', verifyToken, getMyReferral);
router.post('/agent/signup', verifyToken, authorize('agent'), agentSignup);
router.get('/agent/stats', verifyToken, authorize('agent'), getAgentStats);
router.get('/agent/signups', verifyToken, authorize('agent'), getAgentSignups);
// verifyTokened
router.get('/dashboard', verifyToken, getDashboard);
router.get('/me', verifyToken, getDashboard);




router.get('/profile/me', verifyToken, getMyProfile);
router.put('/profile/me', verifyToken, updateMyProfile);
router.put('/profile/me/avatar', verifyToken, updateMyAvatar);



export default router;