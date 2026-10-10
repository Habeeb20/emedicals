import { Router } from 'express';
// Adapt these to your own auth middleware:
//   verifyToken     -> requires login, sets req.user (full user doc incl. role, organization)
//   optionalAuth-> sets req.user if a valid token is present, otherwise continues
//   authorize   -> authorize('super_admin') checks req.user.role

import { optionalAuth, verifyToken,  } from '../middleware/auth.js';
import { toggleLike, recordShare, recordView, getStats, getMyLikes,
      createReview, updateReview, deleteReview, getTargetReviews,
  getMyReviews, replyToReview, moderateReview,
   getMyLoyalty, getLoyaltyHistory, getLoyaltyRules,

} from '../controllers/engagementController.js';



const router = Router();

// ---- Interactions (:targetType is "user" or "organization") ----
router.get('/interactions/me/likes', verifyToken, getMyLikes);
router.get('/interactions/:targetType/:targetId/stats', getStats);
router.post('/interactions/:targetType/:targetId/like', verifyToken, toggleLike);
router.post('/interactions/:targetType/:targetId/share', verifyToken, recordShare);
router.post('/interactions/:targetType/:targetId/view',  recordView);
router.get('/interactions/:targetType/:targetId/stats', optionalAuth, getStats);
router.post('/interactions/:targetType/:targetId/view', optionalAuth, recordView);
// ---- Reviews ----
router.get('/reviews/me', verifyToken, getMyReviews);
router.get('/reviews/:targetType/:targetId', getTargetReviews);
router.post('/reviews/:targetType/:targetId', verifyToken, createReview);
router.put('/reviews/:id', verifyToken, updateReview);
router.delete('/reviews/:id', verifyToken, deleteReview);
router.post('/reviews/:id/reply', verifyToken, replyToReview);
router.put('/reviews/:id/visibility', verifyToken, moderateReview);

// ---- Loyalty ----
router.get('/loyalty/rules', getLoyaltyRules);
router.get('/loyalty/me', verifyToken, getMyLoyalty);
router.get('/loyalty/history', verifyToken, getLoyaltyHistory);


export default router;

