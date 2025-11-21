import nodemailer, { Transporter } from 'nodemailer';

// Handle both ESM and CommonJS nodemailer exports
const createTransporter = (nodemailer as any).default?.createTransport || (nodemailer as any).createTransport;

// SMTP Configuration from environment variables
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'mail.arriival.com',
  port: SMTP_PORT,
  secure: true,  // Use SSL for port 465
  auth: {
    user: process.env.SMTP_USER || 'aimagicbox@arriival.com',
    pass: process.env.SMTP_PASS || 'Arr!!9394!@#',
  },
  connectionTimeout: 10000, // 10 seconds - shorter timeout
  greetingTimeout: 10000,
  socketTimeout: 10000,
  pool: false, // Disable pooling to avoid connection issues
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1',
  },
  // Disable debug in production to reduce overhead
  debug: false,
  logger: false,
};

const FROM_EMAIL = process.env.SMTP_FROM || 'aimagicbox@arriival.com';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'AI MagicBox';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

let transporter: Transporter | null = null;

function getTransporter( ): Transporter {
  if (!transporter) {
    console.log('[Email] Creating SMTP transporter with config:', {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      user: SMTP_CONFIG.auth.user,
    });
    transporter = createTransporter(SMTP_CONFIG);
    console.log('[Email] SMTP transporter created');
  }
  return transporter as Transporter;
}

/**
 * Send verification email to user with retry mechanism
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  username?: string
): Promise<boolean> {
  const maxRetries = 3;
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Email] Attempt ${attempt}/${maxRetries}: Sending verification email to:`, email);
      console.log('[Email] FROM_NAME:', FROM_NAME, 'FROM_EMAIL:', FROM_EMAIL);
      console.log('[Email] APP_URL:', APP_URL);
    
    const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Verify your email address – AI MagicBox',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">AI MagicBox</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">Welcome${username ? `, ${username}` : ''}!</h2>
                      
                      <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                        Thank you for signing up for AI MagicBox. To complete your registration and start creating amazing marketing content, please verify your email address.
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                              Verify My Email
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 10px 0 0; color: #667eea; font-size: 14px; word-break: break-all;">
                        ${verificationUrl}
                      </p>
                      
                      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eeeeee;">
                      
                      <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                        This verification link will expire in 24 hours. If you didn't create an account with AI MagicBox, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        © 2025 AI MagicBox. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `.trim(),
    };

    const transporter = getTransporter();
    
    // Add timeout to prevent hanging (reduced to 15 seconds)
    const sendMailWithTimeout = Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), 15000)
      )
    ]);
    
    const info = await sendMailWithTimeout as any;
    
    console.log('[Email] Verification email sent successfully:', {
      messageId: info.messageId,
      to: email,
      accepted: info.accepted,
      rejected: info.rejected,
    });
    
      return true;
    } catch (error) {
      lastError = error;
      console.error(`[Email] Attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : 'Unknown error');
      
      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`[Email] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  console.error('[Email] All attempts failed to send verification email');
  console.error('[Email] Last error:', {
    message: lastError instanceof Error ? lastError.message : 'Unknown error',
    stack: lastError instanceof Error ? lastError.stack : undefined
  });
  return false;
}

// ... (rest of the file remains the same)
