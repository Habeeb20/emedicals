import nodemailer from 'nodemailer';

let transporter;
const getTransporter = () =>
  (transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));

export async function sendEmail({ to, subject, html }) {
  if (!to) return;
  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'eMedicals <no-reply@emedicals.app>',
    to, subject, html,
  });
}

export const emailTemplate = (name, title, body) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <h2 style="color:#0f766e;margin:0 0 12px">${title}</h2>
  <p>Hi ${name || 'there'},</p>
  <p style="line-height:1.6">${body}</p>
  <p style="color:#6b7280;font-size:12px;margin-top:24px">eMedicals</p>
</div>`;
