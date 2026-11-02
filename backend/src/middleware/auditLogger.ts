import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../config/db';

export const logAuditEvent = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    next(); // Process request first
    if (req.user?.userId && res.statusCode >= 200 && res.statusCode < 300) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            action,
            resource,
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown'
          }
        });
      } catch (err) {
        console.error('[AuditLog Error]', err);
      }
    }
  };
};
