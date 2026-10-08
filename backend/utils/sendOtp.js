import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

const secret = () => {
  const s = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error('OTP_SECRET or JWT_SECRET must be set');
  return s;
};

// Only the hash is stored, never the plain code
export const hashOtp = (code) =>
  crypto.createHmac('sha256', secret()).update(String(code)).digest('hex');

const generateCode = () =>
  crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');

const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Created lazily so dotenv has already loaded by the time we read process.env (ESM import order)
let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

// Email failures must never crash or block the main flow
const safeSendEmail = async (mail) => {
  try {
    if (!process.env.SMTP_HOST) {
      if (process.env.NODE_ENV === 'production') throw new Error('SMTP is not configured');
      console.log(`[DEV] Email to ${mail.to}\n${mail.text}`);   // dev fallback: read the code in the console
      return true;
    }
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || `"eMedicals" <${process.env.SMTP_USER}>`,
      ...mail,
    });
    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
};

/**
 * Generates an OTP, stores its hash on the user, and emails the code.
 * The controller only calls this; it never touches the code itself.
 *
 * @param {{ _id: any, email: string, fullName?: string }} user
 * @param {{ purpose?: string }} [options] wording used in the email, e.g. "verify your email"
 * @returns {Promise<{ sent: boolean, reason?: 'cooldown'|'email_failed'|'user_not_found', retryAfterSeconds?: number, expiresInMinutes?: number }>}
 */
export const sendOtp = async (user, { purpose = 'verify your email' } = {}) => {
  const code = generateCode();
  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - OTP_RESEND_COOLDOWN_SECONDS * 1000);

  // Atomic: only issues a new code if the last one was sent longer ago than the cooldown
  const updated = await User.findOneAndUpdate(
    {
      _id: user._id,
      $or: [{ 'otp.lastSentAt': { $exists: false } }, { 'otp.lastSentAt': { $lt: cooldownCutoff } }],
    },
    {
      $set: {
        'otp.codeHash': hashOtp(code),
        'otp.expiresAt': new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000),
        'otp.attempts': 0,
        'otp.lastSentAt': now,
      },
    },
    { new: true }
  ).select('_id');

  if (!updated) {
    const current = await User.findById(user._id).select('+otp.lastSentAt');
    if (!current) return { sent: false, reason: 'user_not_found' };
    const elapsed = (now - current.otp.lastSentAt) / 1000;
    return {
      sent: false,
      reason: 'cooldown',
      retryAfterSeconds: Math.max(1, Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed)),
    };
  }

  const firstName = (user.fullName || '').split(' ')[0] || 'there';
  const emailSent = await safeSendEmail({
    to: user.email,
    subject: `${code} is your eMedicals verification code`,
    text: `Hi ${firstName}, use this code to ${purpose}: ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#0D9488;margin:0 0 8px">eMedicals</h2>
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>Use this code to ${escapeHtml(purpose)}:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0F172A;margin:16px 0">${code}</p>
        <p style="color:#64748b;font-size:13px">It expires in ${OTP_TTL_MINUTES} minutes. If you didn't request it, you can ignore this email.</p>
      </div>`,
  });

  if (!emailSent) {
    // Let the user retry immediately instead of waiting out the cooldown
    await User.updateOne({ _id: user._id }, { $unset: { 'otp.lastSentAt': 1 } });
    return { sent: false, reason: 'email_failed' };
  }

  return { sent: true, expiresInMinutes: OTP_TTL_MINUTES };
};

export default sendOtp;