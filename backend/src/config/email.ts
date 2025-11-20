import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const rawUser = process.env.EMAIL_USER?.trim();
const rawPass = process.env.EMAIL_PASSWORD?.trim();
const isConfigured = !!rawUser && !!rawPass && rawPass.length === 16;

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: rawUser,
        pass: rawPass
      }
    })
  : nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows'
    } as any);

// Verify configuration
if (isConfigured) {
  console.log(`📧 Initializing SMTP: host=${process.env.EMAIL_HOST} port=${process.env.EMAIL_PORT} secure=${process.env.EMAIL_SECURE}`);
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️  Email service verification failed:', error.message);
    } else {
      console.log('✅ Email service ready');
    }
  });
} else {
  console.log('⚠️  Email service running in MOCK mode (no credentials / invalid app password length)');
}

export default transporter;
