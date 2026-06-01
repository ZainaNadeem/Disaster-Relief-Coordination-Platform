import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '@prisma/client';

// The data we embed inside every JWT. `sub` is the standard "subject" claim
// and holds the user's id.
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Add it to your environment (.env).');
  }
  return secret;
}

// Create a signed token that expires after JWT_EXPIRES_IN (default 8 hours).
export function signToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, getSecret(), options);
}

// Verify a token's signature + expiry and return its payload. Throws if invalid.
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
