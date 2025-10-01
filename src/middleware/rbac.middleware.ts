import { Request, Response, NextFunction } from 'express';

export function requireRole(role: 'Admin'|'Organizer'|'User') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== role && user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
