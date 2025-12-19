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
  console.log(req.body);
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
  try {
    const verifyToken = signAccessToken({ sub: user.user_id, action: 'verify-email' });
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email?token=${verifyToken}`;
    await sendEmail(
      user.email,
      'Verify Your ParadisePay Email Address',
      `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">ParadisePay</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333; margin-top: 0;">Email Verification Required</h2>
          
          <p style="margin-bottom: 20px;">Dear ${user.name || 'ParadisePay User'},</p>
          
          <p style="margin-bottom: 20px;">Thank you for registering with ParadisePay. To complete your account setup, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      font-weight: bold;
                      display: inline-block;">
              Verify My Email Address
            </a>
          </div>
          
          <p style="margin-bottom: 20px; font-size: 14px; color: #666;">
            If the button above doesn't work, you can copy and paste the following URL into your browser:
          </p>
          
          <div style="background-color: #fff; 
                      border-left: 4px solid #667eea; 
                      padding: 12px; 
                      margin: 20px 0;
                      word-break: break-all;
                      font-size: 13px;
                      color: #555;">
            ${verifyUrl}
          </div>
          
          <p style="margin-bottom: 20px;">This verification step ensures the security of your account and allows you to access all ParadisePay features.</p>
          
          <p style="margin-bottom: 20px;">If you did not create an account with ParadisePay, please disregard this email or contact our support team for assistance.</p>
          
          <p>Thank you for choosing ParadisePay. We look forward to serving you!</p>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 5px 0;">ParadisePay Support</p>
          <p style="margin: 5px 0;">
            <a href="mailto:support@paradisepay.com" style="color: #667eea;">support@paradisepay.com</a>
          </p>
          <p style="margin: 5px 0;">
            <a href="https://www.paradisepay.com" style="color: #667eea;">www.paradisepay.com</a>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 11px; color: #999;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
      `
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to send verification email' });
  }

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
    if (!email) {
      console.log('Password reset request: Missing email field');
      return res.status(400).json({ message: 'Missing email' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Password reset request: Invalid email format:', email);
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // Log the attempt without revealing user existence
      console.log('Password reset request: User not found for email:', email);
      return res.status(200).json({ message: 'If an account exists, a reset email was sent' });
    }

    const token = signAccessToken({ sub: user.user_id, action: 'reset-password' });
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password?token=${token}`;

    try {
      await sendEmail(email, 'Reset your password', `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p><p>This link will expire in 15 minutes.</p>`);
      console.log('Password reset email sent successfully to:', email);

      // Log the reset request in audit logs
      await pool.execute('INSERT INTO audit_logs (user_id, action, ip, user_agent, meta) VALUES (?, ?, ?, ?, ?)',
        [user.user_id, 'password_reset_request', req.ip, req.headers['user-agent']?.toString(), JSON.stringify({ email })]);

    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
    }

    return res.json({ message: 'If an account exists, a reset email was sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'Missing fields' });
  try {
    const payload: any = verifyAccessToken(token) as any;
    if (payload.action !== 'reset-password') return res.status(400).json({ message: 'Invalid token' });
    const userId = payload.sub;
    const hash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await updatePassword(userId, hash);

    // Log successful password reset
    await pool.execute('INSERT INTO audit_logs (user_id, action, ip, user_agent, meta) VALUES (?, ?, ?, ?, ?)',
      [userId, 'password_reset', req.ip, req.headers['user-agent']?.toString(), JSON.stringify({})]);

    return res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
}

export async function getResetPasswordForm(req: Request, res: Response) {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  try {
    // Validate token before showing form
    const payload: any = verifyAccessToken(token as string) as any;
    if (payload.action !== 'reset-password') {
      return res.status(400).send('Invalid token type');
    }

    // Serve HTML form
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password - ParadisePay</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 400px;
          margin: 50px auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 30px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          color: #555;
        }
        input[type="password"] {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        button {
          width: 100%;
          padding: 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        button:hover {
          background-color: #0056b3;
        }
        .error {
          color: #dc3545;
          margin-bottom: 10px;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Reset Your Password</h1>
        <div id="error" class="error"></div>
        <form id="resetForm">
          <div class="form-group">
            <label for="newPassword">New Password:</label>
            <input type="password" id="newPassword" name="newPassword" required minlength="8">
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm Password:</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required minlength="8">
          </div>
          <input type="hidden" name="token" value="${token}">
          <button type="submit">Reset Password</button>
        </form>
      </div>

      <script>
        document.getElementById('resetForm').addEventListener('submit', async (e) => {
          e.preventDefault();

          const newPassword = document.getElementById('newPassword').value;
          const confirmPassword = document.getElementById('confirmPassword').value;
          const token = document.querySelector('input[name="token"]').value;
          const errorDiv = document.getElementById('error');

          // Client-side validation
          if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            errorDiv.style.display = 'block';
            return;
          }

          if (newPassword.length < 8) {
            errorDiv.textContent = 'Password must be at least 8 characters long';
            errorDiv.style.display = 'block';
            return;
          }

          try {
            const response = await fetch('/api/v1/auth/reset-password', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token, newPassword }),
            });

            const result = await response.json();

            if (response.ok) {
              alert('Password reset successfully! You can now log in with your new password.');
              window.location.href = '/login'; // Redirect to login page
            } else {
              errorDiv.textContent = result.message || 'An error occurred';
              errorDiv.style.display = 'block';
            }
          } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
            errorDiv.style.display = 'block';
          }
        });
      </script>
    </body>
    </html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Reset password form error:', err);
    res.status(400).send('Invalid or expired token');
  }
}
