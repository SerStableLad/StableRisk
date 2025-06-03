import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import NodeCache from 'node-cache';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

// Initialize cache
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Create Express app
const app = express();

// Apply middleware
app.use(cors());
app.use(express.json());

// Apply rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;