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