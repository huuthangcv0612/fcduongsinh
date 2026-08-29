require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middlewares/errorHandler');
const { ensureAdminUser } = require('./controllers/authController');
const startCronJobs = require('./cron');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

// Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Quá nhiều request, vui lòng thử lại sau 15 phút' } }
});
app.use('/api', generalLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState // 1 = connected
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Connect DB & Start Server
async function startServer() {
  await connectDB();
  await ensureAdminUser();
  startCronJobs();

  app.listen(PORT, () => {
    console.log(`🚀 Football Team Backend API Server running on http://localhost:${PORT}`);
  });
}

startServer();
