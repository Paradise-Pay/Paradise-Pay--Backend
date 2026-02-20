/**
 * @openapi
 * /api/v1/auth/google:
 *   post:
 *     summary: Sign in with Google
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
 *     responses:
 *       200:
 *         description: Google sign in successful
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */

import { Router } from 'express';
import { googleSignIn } from '../controllers/google-auth.controller';

const router = Router();

router.post('/google', googleSignIn);

export default router;

