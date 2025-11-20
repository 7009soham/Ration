import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: "cardholder" | "shopkeeper" | "admin";
    shopId: string | null;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Debug bypass ONLY for notifications or stocks listing
  if (
    req.headers['x-debug'] === 'true' &&
    req.method === 'GET' &&
    (req.originalUrl.startsWith('/api/notifications') || req.originalUrl.startsWith('/api/stocks'))
  ) {
    req.user = {
      userId: 1,
      email: 'test@example.com',
      role: 'cardholder',
      shopId: 'SHOP001',
    };
    console.log('[DEBUG AUTH BYPASS] route:', req.originalUrl, 'user.shopId:', req.user.shopId);
    return next();
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as any;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      shopId: typeof decoded.shopId === 'string' ? decoded.shopId : null,
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ⭐ Add this back
export const authorizeRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};
