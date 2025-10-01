import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const ACCESS: Secret = process.env.JWT_ACCESS_SECRET as Secret;
const REFRESH: Secret = process.env.JWT_REFRESH_SECRET as Secret;
const ACCESS_EXP = (process.env.ACCESS_TOKEN_EXPIRY ?? '15m') as SignOptions['expiresIn'];
const REFRESH_EXP = (process.env.REFRESH_TOKEN_EXPIRY ?? '30d') as SignOptions['expiresIn'];

if (!ACCESS || !REFRESH) throw new Error('JWT secrets missing');

export function signAccessToken(payload: object) {
  return jwt.sign(payload, ACCESS, { expiresIn: ACCESS_EXP });
}
export function signRefreshToken(payload: object) {
  return jwt.sign(payload, REFRESH, { expiresIn: REFRESH_EXP });
}
export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS);
}
export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH);
}
