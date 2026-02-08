import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const port = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  try {
    const info = await transporter.sendMail({
      from: `"Paradise Pay" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent:', info.messageId);
    return info;
  } catch (err: any) {
    console.error('SMTP send failed:', err?.message || err);
    throw new Error('Email service unavailable');
  }
}
