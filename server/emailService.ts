import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Handle both ESM and CommonJS nodemailer exports
const createTransporter = (nodemailer as any).default?.createTransport || (nodemailer as any).createTransport;

// SMTP Configuration from environment variables
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'mail.arriival.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'careteam@arriival.com',
    pass: process.env.SMTP_PASS || 'Lin!!8899!@#!@#',
  },
};

const FROM_EMAIL = process.env.SMTP_FROM || 'careteam@arriival.com';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'AI MagicBox';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransporter(SMTP_CONFIG);
    console.log('[Email] SMTP transporter created');
  }
  return transporter;
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  username?: string
): Promise<boolean> {
  try {
    const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Verify Your Email - AI MagicBox',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                        ✨ AI MagicBox
                      </h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">
                        Welcome to AI-Powered Marketing
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">
                        Verify Your Email Address
                      </h2>
                      
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        ${username ? `Hi ${username},` : 'Hello,'}
                      </p>
                      
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Thank you for registering with AI MagicBox! To complete your registration and start creating stunning marketing campaigns, please verify your email address by clicking the button below:
                      </p>
                      
                      <!-- Verification Button -->
                      <table role="presentation" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      
                      <p style="margin: 0 0 20px 0; padding: 12px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all; font-size: 14px; color: #667eea;">
                        ${verificationUrl}
                      </p>
                      
                      <p style="margin: 20px 0 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                        This verification link will expire in 24 hours. If you didn't create an account with AI MagicBox, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #999999; font-size: 12px; text-align: center; line-height: 1.6;">
                        © 2024 AI MagicBox. All rights reserved.
                      </p>
                      <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px; text-align: center;">
                        Create Stunning Marketing Campaigns with AI
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Welcome to AI MagicBox!

${username ? `Hi ${username},` : 'Hello,'}

Thank you for registering with AI MagicBox! To complete your registration and start creating stunning marketing campaigns, please verify your email address by visiting this link:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with AI MagicBox, please ignore this email.

© 2024 AI MagicBox. All rights reserved.
      `.trim(),
    };

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    
    console.log('[Email] Verification email sent:', {
      messageId: info.messageId,
      to: email,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    
    return true;
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error);
    return false;
  }
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(
  email: string,
  username?: string
): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to AI MagicBox! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AI MagicBox</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px;">
                        🎉 Welcome!
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">
                        Your Account is Ready!
                      </h2>
                      
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        ${username ? `Hi ${username},` : 'Hello,'}
                      </p>
                      
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Congratulations! Your email has been verified and your AI MagicBox account is now active. You're all set to start creating amazing AI-powered marketing campaigns!
                      </p>
                      
                      <table role="presentation" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${APP_URL}/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                              Go to Dashboard
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        If you have any questions, feel free to reach out to our support team.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #999999; font-size: 12px; text-align: center;">
                        © 2024 AI MagicBox. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Welcome to AI MagicBox!

${username ? `Hi ${username},` : 'Hello,'}

Congratulations! Your email has been verified and your AI MagicBox account is now active.

Visit your dashboard: ${APP_URL}/dashboard

If you have any questions, feel free to reach out to our support team.

© 2024 AI MagicBox. All rights reserved.
      `.trim(),
    };

    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    
    console.log('[Email] Welcome email sent:', {
      messageId: info.messageId,
      to: email,
    });
    
    return true;
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Test SMTP connection
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('[Email] SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  username?: string
): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM}>`,
      to: email,
      subject: 'Reset Your Password - AI MagicBox',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f5f7;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f7; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; text-align: center;">
                      <div style="width: 64px; height: 64px; margin: 0 auto 16px auto; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px;">
                        🔑
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                        ${username ? `Hi ${username},` : 'Hello,'}
                      </p>
                      
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password for your AI MagicBox account. Click the button below to create a new password:
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 0 0 20px 0; color: #667eea; font-size: 14px; word-break: break-all;">
                        ${resetUrl}
                      </p>
                      
                      <p style="margin: 0 0 20px 0; color: #999999; font-size: 14px; line-height: 1.6;">
                        This link will expire in 1 hour for security reasons.
                      </p>
                      
                      <p style="margin: 0 0 20px 0; color: #999999; font-size: 14px; line-height: 1.6;">
                        If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                        This is an automated email from AI MagicBox. Please do not reply.
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        © ${new Date().getFullYear()} AI MagicBox. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
${username ? `Hi ${username},` : 'Hello,'}

We received a request to reset your password for your AI MagicBox account.

To reset your password, visit this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

Best regards,
The AI MagicBox Team
      `.trim(),
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('[Email] Password reset email sent:', {
      messageId: info.messageId,
      to: email,
    });
    
    return true;
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error);
    return false;
  }
}
