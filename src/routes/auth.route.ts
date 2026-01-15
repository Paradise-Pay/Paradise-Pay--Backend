/**
 * @openapi
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: StrongPass123
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               nickname:
 *                 type: string
 *                 example: John Doe
 *               role:
 *                 type: string
 *                 example: User
 *     responses:
 *       201:
 *         description: User created successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: StrongPass123
 *     responses:
 *       200:
 *         description: Login successful, returns tokens
 *       500:
 *         description: Internal server error
 */

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken 
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: 1234567890
 *     responses:
 *       200:
 *         description: Logout successful
 *       500:
 *         description: Internal server error
 */

/**
 * @openapi
 * /api/v1/auth/verify-email:
 *   get:
 *     summary: Verify email
 *     tags:
 *       - Authentication
 *     parameters:
 *       - name: token
 *         in: query
 *         required: true
 *         type: string
 *         example: 1234567890
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: 1234567890
 *               newPassword:
 *                 type: string
 *                 example: StrongPass123
 *               confirmPassword:
 *                 type: string
 *                 example: StrongPass123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @openapi
 * /api/v1/auth/reset-password-request:
 *   post:
 *     summary: Reset password request
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Password reset request sent successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @openapi
 * /api/v1/auth/updateuser/{userId}:
 *   post:
 *     summary: Update user details
 *    tags:
 *    - Authentication
 *    parameters:
 *     - name: userId
 *      in: path
 *    required: true
 *   type: string
 *    example: 60d0fe4f5311236168a109ca
 *   requestBody:
 *    required: true
 *   content:
 *    application/json:
 *    schema:
 *    type: object
 *   properties:
 *    name:
 *    type: string
 *   example: John Doe
 *   phone:
 *   type: string
 *  example: +1234567890
 *  nickname:
 *  type: string
 * example: Johnny
 *    responses:
 *    200:
 *    description: User details updated successfully
 *   500:
 *   description: Internal server error
 */

import { Router  } from "express";
import {
    signup,
    login,
    logout,
    resetPassword,
    resetPasswordRequest,
    verifyEmailHandler,
    getResetPasswordForm,
    updateUserDetails
} from "../controllers/auth.controller.js"

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/reset-password", resetPassword);
router.post("/reset-password-request", resetPasswordRequest);
router.get("/reset-password", getResetPasswordForm);
router.post("/verify-email", verifyEmailHandler);
router.post("/updateuser/:userId", updateUserDetails);

export default router;
