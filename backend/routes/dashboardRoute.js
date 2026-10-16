import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getOverview } from '../controllers/dashboardController.js';


const router = Router();

// Role-aware overview for the dashboard home tab
router.get('/dashboard/overview', verifyToken, getOverview);

export default router;

// Mount in app.js:  import dashboardRouter from './routes/dashboard.routes.js';
//                   app.use('/api', dashboardRouter);
// (your existing GET /api/users/dashboard is untouched)