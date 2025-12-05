import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt', { 
      token: token.substring(0, 10) + '...', 
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export const generateToken = (payload: { id: string; role: string }): string => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: '24h' });
};

// Middleware para endpoints públicos (apenas log)
export const logRequest = (req: Request, res: Response, next: NextFunction): void => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
  next();
};

// Middleware para validar API Key (alternativa ao JWT para webhooks)
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  // Para webhooks, você pode usar uma API key específica
  const validApiKey = process.env.WEBHOOK_API_KEY || 'your-webhook-api-key';
  
  if (!apiKey || apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', { 
      providedKey: apiKey ? apiKey.substring(0, 8) + '...' : 'none',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }
  
  next();
};