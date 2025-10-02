/**
 * @openapi
 * /auth/signup:
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
 *               
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
 *     responses:
 *       201:
 *         description: User created successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @openapi
 * /auth/login:
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
 * /auth/logout:
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
import { Router  } from "express";
import {
    signup,
    login,
    logout,
    resetPassword,
    resetPasswordRequest,
    verifyEmailHandler
} from "../controllers/auth.controller"

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/reset-password", resetPassword);
router.post("/reset-password-request", resetPasswordRequest);
router.post("/verify-email", verifyEmailHandler);

export default router;