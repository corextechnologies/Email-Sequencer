import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

export class JwtHelper {
  private static readonly secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

  static generateToken(payload: JwtPayload): string {
    const tokenPayload = { 
      userId: payload.userId, 
      email: payload.email 
    };
    
    return jwt.sign(tokenPayload, this.secret, { expiresIn: '24h' });
  }

  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as any;
      
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  static decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.userId && decoded.email) {
        return {
          userId: decoded.userId,
          email: decoded.email
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
