import { Request, Response, NextFunction } from 'express';
import compression from 'compression';

// Response compression middleware
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
});

// Request timeout middleware
export const timeoutMiddleware = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    }, timeout);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
};

// Cache headers middleware
export const cacheMiddleware = (maxAge: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    }
    next();
  };
};

// Request logging with performance metrics
export const performanceLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Log only slow requests
      console.log(`Slow request: ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  
  next();
};