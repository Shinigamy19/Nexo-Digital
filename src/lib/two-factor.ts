/**
 * TOTP-based Two-Factor Authentication helpers.
 *
 * Uses the `otpauth` library for TOTP generation/verification
 * and `qrcode` for generating QR code data URLs.
 */

import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { env } from './env';

const ISSUER = 'Nexo Digital';

/**
 * Generate a new TOTP secret for a user.
 * Returns the secret (base32 encoded) and the TOTP instance.
 */
export function createTOTPSecret(userEmail: string): {
  secret: string;
  totp: OTPAuth.TOTP;
} {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    totp,
  };
}

/**
 * Generate a QR code data URL from a TOTP instance.
 * The user scans this with their authenticator app.
 */
export async function generateQRCode(totp: OTPAuth.TOTP): Promise<string> {
  const uri = totp.toString();
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Verify a TOTP token against a secret.
 * Returns true if the token is valid.
 */
export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

/**
 * Build the otpauth:// URI for manual entry (shown as fallback below QR).
 */
export function getTOTPUri(totp: OTPAuth.TOTP): string {
  return totp.toString();
}
