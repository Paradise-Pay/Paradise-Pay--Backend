import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  // Add connection timeout and other options for reliability
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

// Verify transporter configuration on startup
if (process.env.NODE_ENV === 'production') {
  transporter.verify((error, success) => {
    if (error) {
      console.error('SMTP configuration error:', error);
    } else {
      console.log('SMTP server is ready to send emails');
    }
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!to || !subject || !html) {
      throw new Error('Missing required email parameters');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'no-reply@paradisepay.com',
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Email service unavailable');
  }
}
