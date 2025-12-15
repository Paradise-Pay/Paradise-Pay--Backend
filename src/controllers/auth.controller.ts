import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { createUser, findUserByEmail, findUserById, setEmailVerified, updatePassword } from '../repositories/user.repo.js';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../services/jwt.service.js';
import { storeRefreshToken, revokeRefreshTokenByHash, findRefreshToken } from '../repositories/token.repo.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { sendEmail } from '../services/email.service.js';
import pool from '../db/db.js';

dotenv.config();

const BCRYPT_SALT_ROUNDS = 12;

export async function signup(req: Request, res: Response) {
  try {
  const { name, email, phone, password, nickname } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  const existing = await findUserByEmail(email);
  if (existing) return res.status(409).json({ message: 'Email already used' });

  const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await createUser({ name, email, phone, passwordHash: hash });
  // generate card number & qr (simple random here; replace with business format)
  const cardNumber = `PP${Math.floor(100000000 + Math.random()*900000000)}`;
  const cardId = uuidv4();
  await pool.execute('INSERT INTO digital_cards (card_id, user_id, card_number) VALUES (?, ?, ?)', [cardId, user.user_id, cardNumber]);

  // email verification token (short-lived)
  // const verifyToken = signAccessToken({ sub: user.user_id, action: 'verify-email' });
  // const verifyUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email?token=${verifyToken}`;
  // await sendEmail(user.email, 'Verify your ParadisePay email', `<p>Click <a href="${verifyUrl}">here</a> to verify.</p>`);

    return res.status(201).json({ message: 'User created.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await pool.execute('INSERT INTO audit_logs (user_id, action, ip, user_agent, meta) VALUES (?, ?, ?, ?, ?)', [user.user_id, 'login_failed', req.ip, req.headers['user-agent']?.toString(), JSON.stringify({ email })]);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.mfa_enabled) {
    // TODO: start MFA flow (TOTP push) — for now indicate MFA required
    return res.status(200).json({ mfa_required: true, message: 'MFA required' });
  }

  const accessToken = signAccessToken({ sub: user.user_id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.user_id });
  // store refresh token hash
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // match REFRESH_TOKEN_EXPIRY
  await storeRefreshToken(user.user_id, refreshToken, expiresAt);

  await pool.execute('INSERT INTO audit_logs (user_id, action, ip, user_agent, meta) VALUES (?, ?, ?, ?, ?)', [user.user_id, 'login_success', req.ip, req.headers['user-agent']?.toString(), JSON.stringify({})]);

  return res.json({ accessToken, refreshToken, user: { user_id: user.user_id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });
  // verify token
  try {
    const payload = verifyRefreshToken(refreshToken) as any;
    const stored = await findRefreshToken(refreshToken);
    if (!stored) return res.status(401).json({ message: 'Invalid refresh token' });
    if (new Date(stored.expires_at) < new Date()) return res.status(401).json({ message: 'Expired refresh token' });

    const accessToken = signAccessToken({ sub: payload.sub, role: payload.role });
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });
  await revokeRefreshTokenByHash(refreshToken);
  return res.json({ message: 'Logged out' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function verifyEmailHandler(req: Request, res: Response) {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');
  try {
    const payload = verifyAccessToken(token as string) as any; // ✅ use access token verifier
    if (payload.action !== 'verify-email') {
      return res.status(400).send('Invalid token type');
    }
    await setEmailVerified(payload.sub);
    return res.send('Email verified successfully ✅');
  } catch (err) {
    console.error(err);
    return res.status(400).send('Invalid or expired token');
  }
}

export async function resetPasswordRequest(req: Request, res: Response) {
  try {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Missing email' });
  const user = await findUserByEmail(email);
  if (!user) return res.status(200).json({ message: 'If an account exists, a reset email was sent' }); // do not leak
  const token = signAccessToken({ sub: user.user_id, action: 'reset-password' });
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password?token=${token}`;
  await sendEmail(email, 'Reset your password', `<p>Reset link: <a href="${resetUrl}">${resetUrl}</a></p>`);
  return res.json({ message: 'If an account exists, a reset email was sent' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
    console.error(error);
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'Missing fields' });
  try {
    const payload: any = verifyRefreshToken(token) as any;
    if (payload.action !== 'reset-password') return res.status(400).json({ message: 'Invalid token' });
    const userId = payload.sub;
    const hash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await updatePassword(userId, hash);
    return res.json({ message: 'Password updated' });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired token' });
    console.error(err);
  }
}
