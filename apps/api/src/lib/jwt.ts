import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@kidcare/types';
import { env } from '../env.ts';

const secret = new TextEncoder().encode(env.jwtSecret);

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  /** Identificador unico del token; permite revocar UNO sin invalidar el resto. */
  jti: string;
  /** Expiracion en segundos desde epoch, para saber hasta cuando guardar la revocacion. */
  exp: number;
}

export async function signToken(
  payload: Pick<TokenPayload, 'sub' | 'email' | 'role'>,
): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  if (!payload.sub) throw new Error('token sin subject');
  if (!payload.jti) throw new Error('token sin jti');
  if (!payload.exp) throw new Error('token sin exp');
  return {
    sub: payload.sub,
    email: String(payload.email ?? ''),
    role: payload.role as Role,
    jti: payload.jti,
    exp: payload.exp,
  };
}
