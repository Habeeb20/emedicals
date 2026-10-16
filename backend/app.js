import 'dotenv/config';            // must be first so env vars exist before any other module reads them
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import {connectDb} from './db.js';
import userRoutes from './routes/userRoutes.js';
import morgan from "morgan";
import { notFound, errorHandler } from './middleware/errorHandler.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import { initSocket } from './socket/index.js';
import { paystackWebhook } from './controllers/payment.controller.js';
import { sweepExpiredRequests } from './controllers/quickchat.controller.js';
import appointmentRoutes from "./routes/appoinmentRoute.js"
import labRoutes from "./routes/labRoutes.js"
import engagementRoutes from "./routes/engagementRoutes.js"
import { chatPlanpaystackWebhook } from './controllers/chatPlan.controller.js';
import { webhookRouter } from './routes/pharmacy.routes.js';
import pharmacyRoutes from "./routes/pharmacy.routes.js"
import shopRouter from "./routes/shopRoutes.js"
import http from 'http';
import memorialRoutes from './routes/memorialRoutes.js'
import hospitalRoutes from "./routes/hospitalRoutes.js"
import dashboardRouter from './routes/dashboardRoute.js'
import hospitalMessageRoutes from './routes/hospitalMessageRoutes.js';
connectDb()
const app = express();
const isProd = process.env.NODE_ENV === 'production';
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paystackWebhook);

// Behind a proxy (Render, Railway, Nginx...) so rate limiting sees the real client IP
if (isProd) app.set('trust proxy', 1);



 app.use('/api', webhookRouter);
app.use(morgan('dev'));
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CLIENT_URL || 'http://localhost:5173' || 'http://localhost:5174').split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Express 5 leaves req.body undefined when no body is sent; controllers destructure it
app.use((req, _res, next) => { req.body = req.body || {}; next(); });

// Health check
app.get('/api/health', (_req, res) =>
  res.json({
    success: true,
    service: 'eMedicals API',
    uptime: Math.round(process.uptime()),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
);

// Routes
app.use('/api/hospital', hospitalRoutes)
app.use('/api/memorial', memorialRoutes);
app.use("/api/shop", shopRouter)
app.use("/api/labs", labRoutes)
app.use('/api/users', userRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/hospital/messages', hospitalMessageRoutes);
app.use('/api', pharmacyRoutes);
app.use('/api', dashboardRouter);
app.use('/api', appointmentRoutes);





app.use('/api', engagementRoutes)



app.use((err, _req, res, _next) => res.status(err.status || 500).json({ status: 'error', message: err.message }));
// 404 + error handling (must come last)
app.use(notFound);
app.use(errorHandler);
const port = process.env.PORT || 8000;

const server = http.createServer(app);
initSocket(server);
setInterval(() => sweepExpiredRequests().catch(console.error), 60_000);
server.listen(process.env.port || 8000);





export default app;






