import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import NodeCache from 'node-cache';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from server/.env
const envPath = resolve(__dirname, '.env');
console.log('Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  throw result.error;
}

// Validate required environment variables
const requiredEnvVars = ['PORT', 'NODE_ENV', 'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

// Initialize cache
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Create Express app
const app = express();

// Configure CORS
app.use(cors({
  origin: isProduction ? 'https://your-domain.com' : 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Apply rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  }
});

app.use('/api/', apiLimiter);

// Import API routes
import stablecoinRoutes from './routes/stablecoins.js';

// Register API routes
app.use('/api/stablecoins', stablecoinRoutes);

// Set up Vite for development
if (!isProduction) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  
  app.use(vite.middlewares);
} else {
  // Serve static assets in production
  const distPath = resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  
  // Fallback to index.html for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(resolve(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Env file loaded from: ${envPath}`);
});

export default app;