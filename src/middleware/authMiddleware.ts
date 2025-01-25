// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

import { UserDocument } from '../models/User';

declare global {
	namespace Express {
	  interface Request {
		user?: UserDocument;
	  }
	}
  }

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract the token from Bearer token in Authorization header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };

      // Get user from the token
      req.user = await User.findById(decoded.userId).select('-password');

      next();
    } catch (error) {
      console.error('Error in authMiddleware:', error);
      res.status(401).json({ msg: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ msg: 'Not authorized, no token' });
  }
};
