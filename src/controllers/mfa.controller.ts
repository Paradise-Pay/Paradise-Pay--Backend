import { Request, Response } from 'express';
import { findUserById, setMfaSecret, enableMfa, disableMfa } from '../repositories/user.repo';
import { createOrUpdateDevice, getUserDevices, removeDevice, removeAllUserDevices } from '../repositories/device.repo';
import QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

export async function setupMfaHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `ParadisePay (${user.email})`,
      issuer: 'ParadisePay'
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Store secret and backup codes (but don't enable MFA yet)
    await setMfaSecret(userId, secret.base32!, backupCodes);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return res.json({
      success: true,
      data: {
        secret: secret.base32,
        qr_code: qrCodeUrl,
        backup_codes: backupCodes,
        manual_entry_key: secret.base32
      },
      message: 'MFA setup initiated. Scan QR code or enter manual key in your authenticator app.'
    });
  } catch (error) {
    console.error('Setup MFA error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function verifyMfaSetupHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    const user = await findUserById(userId);
    if (!user || !user.mfa_secret) {
      return res.status(400).json({
        success: false,
        message: 'MFA not set up. Please set up MFA first.',
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token. Please try again.',
      });
    }

    // Enable MFA
    await enableMfa(userId);

    return res.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    console.error('Verify MFA setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function verifyMfaTokenHandler(req: Request, res: Response) {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and token are required',
      });
    }

    const { findUserByEmail } = await import('../repositories/user.repo.js');
    const user = await findUserByEmail(email);
    const userId = user?.user_id;

    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled for this user',
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    // Also check backup codes
    let backupCodeUsed = false;
    if (!verified && user.mfa_backup_codes && userId) {
      const backupCodes = JSON.parse(user.mfa_backup_codes);
      const codeIndex = backupCodes.indexOf(token);
      if (codeIndex !== -1) {
        backupCodes.splice(codeIndex, 1);
        await setMfaSecret(userId, user.mfa_secret || '', backupCodes);
        backupCodeUsed = true;
      }
    }

    if (!verified && !backupCodeUsed) {
      return res.status(401).json({
        success: false,
        message: 'Invalid MFA token',
      });
    }

    return res.json({
      success: true,
      message: 'MFA token verified successfully',
      backup_code_used: backupCodeUsed
    });
  } catch (error) {
    console.error('Verify MFA token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function disableMfaHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { password } = req.body;

    // In a real app, verify password here
    // For now, just disable MFA

    await disableMfa(userId);

    return res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    console.error('Disable MFA error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function getActiveDevicesHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const devices = await getUserDevices(userId);

    return res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    console.error('Get active devices error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function removeDeviceHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { device_id } = req.params;

    const removed = await removeDevice(device_id, userId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    return res.json({
      success: true,
      message: 'Device removed successfully'
    });
  } catch (error) {
    console.error('Remove device error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

export async function registerDeviceHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { device_name, device_type, device_token } = req.body;

    const device = await createOrUpdateDevice({
      user_id: userId,
      device_name,
      device_type,
      device_token,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    return res.json({
      success: true,
      data: device,
      message: 'Device registered successfully'
    });
  } catch (error) {
    console.error('Register device error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

