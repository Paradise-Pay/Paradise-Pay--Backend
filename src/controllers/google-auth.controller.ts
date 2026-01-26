import { Request, Response } from 'express';
import { findUserByGoogleId, createGoogleUser, findUserByEmail } from '../repositories/user.repo.js';
import { signAccessToken, signRefreshToken } from '../services/jwt.service.js';
import { storeRefreshToken } from '../repositories/token.repo.js';
import axios from 'axios';
import pool from '../db/db.js';
import { v4 as uuidv4 } from 'uuid';

export async function googleSignIn(req: Request, res: Response) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    // Verify Google ID token
    try {
      const googleResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`
      );

      const { sub: google_id, email, name, picture } = googleResponse.data;

      if (!email || !google_id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Google token',
        });
      }

      // Check if user exists by Google ID
      let user = await findUserByGoogleId(google_id);

      // If not found by Google ID, check by email
      if (!user) {
        user = await findUserByEmail(email);
        
        // If user exists but doesn't have Google ID, link it
        if (user) {
          await pool.execute('UPDATE users SET google_id = ?, email_verified = 1 WHERE user_id = ?', [google_id, user.user_id]);
          user = await findUserByGoogleId(google_id);
        } else {
          // Create new user
          user = await createGoogleUser({
            name: name || email.split('@')[0],
            email,
            google_id,
            role: 'User'
          });

          // Generate card number
          const cardNumber = `PP${Math.floor(100000000 + Math.random() * 900000000)}`;
          const cardId = uuidv4();
          await pool.execute('INSERT INTO digital_cards (card_id, user_id, card_number) VALUES (?, ?, ?)', [cardId, user.user_id, cardNumber]);
        }
      }

      // Generate tokens
      const accessToken = signAccessToken({ sub: user.user_id, role: user.role });
      const refreshToken = signRefreshToken({ sub: user.user_id });
      
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      await storeRefreshToken(user.user_id, refreshToken, expiresAt);

      // Log login
      await pool.execute('INSERT INTO audit_logs (user_id, action, ip, user_agent, meta) VALUES (?, ?, ?, ?, ?)', 
        [user.user_id, 'google_login_success', req.ip, req.headers['user-agent']?.toString(), JSON.stringify({ email })]);

      return res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            user_id: user.user_id,
            email: user.email,
            name: user.name,
            role: user.role,
            profile_picture_url: picture || user.profile_picture_url
          }
        },
        message: 'Google sign in successful'
      });
    } catch (googleError: any) {
      console.error('Google token verification error:', googleError);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token',
      });
    }
  } catch (error) {
    console.error('Google sign in error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

