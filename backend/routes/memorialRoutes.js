import { Router } from 'express';
// ASSUMPTION: your auth middleware exports `verifyToken` (requires login) and `authorize(...roles)`. Rename here if yours differ.

import { verifyToken, authorize } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/auth.js';

import * as pub from '../controllers/memorialPublicController.js';
import * as book from '../controllers/memorialBookingController.js';
import * as mgr from '../controllers/memorialManageController.js';

const router = Router();
const officer = [verifyToken, authorize('mortuary_officer', 'cemetery_officer')];

/* ---- Public directory + profile (guests welcome) ---- */
router.get('/orgs', optionalAuth, pub.listOrgs);
router.get('/orgs/:id', optionalAuth, pub.getOrg);
router.get('/orgs/:id/plots', pub.getOrgPlots);
router.post('/orgs/:id/view', optionalAuth, pub.recordView);
router.post('/orgs/:id/share', optionalAuth, pub.recordShare);
router.get('/orgs/:id/reviews', optionalAuth, pub.listReviews);

/* ---- Signed-in users: like, review, book ---- */
router.post('/orgs/:id/like', verifyToken, pub.toggleLike);
router.post('/orgs/:id/reviews', verifyToken, pub.upsertReview);
router.delete('/reviews/:id', verifyToken, pub.deleteMyReview);

router.post('/bookings', verifyToken, book.createBooking);
router.get('/bookings', verifyToken, book.listMyBookings);
router.get('/bookings/:id', verifyToken, book.getBooking);
router.post('/bookings/:id/cancel', verifyToken, book.cancelMyBooking);

/* ---- Mortuary / cemetery officers ---- */
router.get('/manage/overview', ...officer, mgr.overview);
router.get('/manage/settings', ...officer, mgr.getSettings);
router.patch('/manage/settings', ...officer, mgr.updateSettings);

router.get('/manage/bookings', ...officer, mgr.listBookings);
router.get('/manage/bookings/:id', ...officer, mgr.getManagedBooking);
router.patch('/manage/bookings/:id/status', ...officer, mgr.updateBookingStatus);
router.post('/manage/bookings/:id/ledger', ...officer, mgr.addLedgerEntry);

router.get('/manage/ledger', ...officer, mgr.listLedger);
router.get('/manage/ledger/export', ...officer, mgr.exportLedger);

router.get('/manage/records', ...officer, mgr.listRecords);
router.post('/manage/records', ...officer, mgr.createRecord);
router.patch('/manage/records/:id', ...officer, mgr.updateRecord);

router.get('/manage/plots', ...officer, mgr.listPlots);
router.post('/manage/plots', ...officer, mgr.createPlot);
router.post('/manage/plots/bulk', ...officer, mgr.bulkCreatePlots);
router.patch('/manage/plots/:id', ...officer, mgr.updatePlot);
router.delete('/manage/plots/:id', ...officer, mgr.deletePlot);

router.get('/manage/reviews', ...officer, mgr.listOrgReviews);
router.post('/manage/reviews/:id/reply', ...officer, mgr.replyToReview);

export default router;
