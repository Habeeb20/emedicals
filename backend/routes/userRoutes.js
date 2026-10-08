import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  signup, login, requestEmailOtp, verifyOtp, getDashboard, getAllUsers
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';
import { getMyProfile, updateMyAvatar, updateMyProfile } from '../controllers/userController.js';
const router = Router();

// Brute-force protection on the public auth endpoints (per IP)
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
// Protected
router.get('/dashboard', verifyToken, getDashboard);
router.get('/me', verifyToken, getDashboard);




router.get('/profile/me', verifyToken, getMyProfile);
router.patch('/profile/me', verifyToken, updateMyProfile);
router.patch('/profile/me/avatar', verifyToken, updateMyAvatar);



export default router;