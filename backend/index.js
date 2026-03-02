import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const PORT = process.env.PORT || 5001;
import booksRouter from './routes/books.js';
import authRouter from './routes/auth.js';
import loansRouter from './routes/loans.js';
import citiesRouter from './routes/cities.js';
import librariesRouter from './routes/libraries.js';
import memberRouter from './routes/member.js';
import librarianRouter from './routes/librarian.js';
import statsRouter from './routes/stats.js';
import BackgroundJobs from './services/BackgroundJobs.js';

const app = express();
const prisma = new PrismaClient();

// Middleware for parsing request body - increase limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'OK',
      message: 'Server is running and database is connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/loans', loansRouter);
app.use('/api/cities', citiesRouter);
app.use('/api/libraries', librariesRouter);
app.use('/api/member', memberRouter);
app.use('/api/librarian', librarianRouter);
app.use('/api/stats', statsRouter);

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Start server
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('[DATABASE] Connected to PostgreSQL');

    // Initialize background jobs
    BackgroundJobs.init();
    console.log('[JOBS] Background jobs initialized');

    app.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`);
      console.log(`[HEALTH] http://localhost:${PORT}/api/health`);
      console.log('[READY] Server ready to accept requests');
    });
  } catch (error) {
    console.error('[FATAL] Server startup failed:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Gracefully shutting down...');
  await prisma.$disconnect();
  console.log('[SHUTDOWN] Database disconnected');
  process.exit(0);
});

startServer();