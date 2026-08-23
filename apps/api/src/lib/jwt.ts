import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@kidcare/types';
import { env } from '../env.ts';

const secret = new TextEncoder().encode(env.jwtSecret);

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  if (!payload.sub) throw new Error('token sin subject');
  return {
    sub: payload.sub,
    email: String(payload.email ?? ''),
    role: payload.role as Role,
  };
}
