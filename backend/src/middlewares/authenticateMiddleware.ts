import { UserModel } from '@models/user.model';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: typeof UserModel;
}

export async function authenticateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Access denied' });
      return;
    } else {
      const decoded: any = jwt.verify(token, 'mysecretkey');
      const user = (await UserModel.findById(decoded.userId)) as typeof UserModel;
      if (user) {
        req.user = user ?? undefined;
      } else {
        res.status(401).json({ error: 'User not found' });
        return;
      }
    }
    next();
  } catch (err) {
    console.log(err);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export function isAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!(req?.user as any)?.isAdmin) {
    res.status(401).send({ error: 'Unauthorized' });
    return;
  }
  next();
}
