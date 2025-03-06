import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

export function setupProduction(app: express.Express) {
  // Security headers
  app.use(helmet());

  // Compression
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/api/', limiter);

  // Trust proxy if behind a reverse proxy
  app.set('trust proxy', 1);
}
