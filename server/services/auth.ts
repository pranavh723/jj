import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'greengrid-development-secret';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

export interface JWTPayload {
  userId: string;
  email: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }
}

export const authService = new AuthService();
