import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail, sendWelcomeEmail } from "./emailService";
import { generateToken } from "./tokenAuth";

const router = Router();

/**
 * Register new user endpoint
 * POST /api/auth/register
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = randomUUID();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const newUser = await db.insert(users).values({
      id: randomUUID(),
      email,
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      emailVerified: 0,
      verificationToken,
      verificationTokenExpiry,
    }).returning();

    if (!newUser || newUser.length === 0) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    // Send verification email
    const emailSent = await sendVerificationEmail(
      email,
      verificationToken,
      displayName || email.split('@')[0]
    );

    if (!emailSent) {
      console.error('[AUTH] Failed to send verification email to:', email);
      // Don't fail the registration, user can request resend later
    }

    console.log('[AUTH] User registered successfully:', {
      id: newUser[0].id,
      email: newUser[0].email,
      emailSent,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        displayName: newUser[0].displayName,
        emailVerified: false,
      },
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * Verify email endpoint
 * GET /api/auth/verify-email?token=xxx
 */
router.get("/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: "Invalid verification token" });
    }

    // Find user with this verification token
    const user = await db.query.users.findFirst({
      where: eq(users.verificationToken, token),
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    // Check if token has expired
    if (user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry)) {
      return res.status(400).json({ error: "Verification token has expired. Please request a new one." });
    }

    // Check if already verified
    if (user.emailVerified === 1) {
      return res.status(200).json({
        success: true,
        message: "Email already verified. You can now log in.",
        alreadyVerified: true,
      });
    }

    // Update user to mark email as verified
    await db.update(users)
      .set({
        emailVerified: 1,
        verificationToken: null,
        verificationTokenExpiry: null,
      })
      .where(eq(users.id, user.id));

    // Send welcome email
    await sendWelcomeEmail(user.email, user.displayName || undefined);

    console.log('[AUTH] Email verified successfully for user:', user.email);

    // Return HTML response with redirect
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified - AI MagicBox</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 48px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .icon {
            font-size: 64px;
            margin-bottom: 24px;
          }
          h1 {
            color: #333;
            font-size: 32px;
            margin-bottom: 16px;
          }
          p {
            color: #666;
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 40px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 16px;
            font-weight: bold;
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .redirect-text {
            margin-top: 24px;
            color: #999;
            font-size: 14px;
          }
        </style>
        <script>
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Email Verified!</h1>
          <p>
            Your email has been successfully verified. You can now log in to your AI MagicBox account and start creating amazing marketing campaigns!
          </p>
          <a href="/" class="button">Go to Login</a>
          <p class="redirect-text">Redirecting automatically in 3 seconds...</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[AUTH] Email verification error:', error);
    return res.status(500).json({ error: "Email verification failed" });
  }
});

/**
 * Resend verification email endpoint
 * POST /api/auth/resend-verification
 */
router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: "If an account with this email exists, a verification email has been sent.",
      });
    }

    // Check if already verified
    if (user.emailVerified === 1) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = randomUUID();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await db.update(users)
      .set({
        verificationToken,
        verificationTokenExpiry,
      })
      .where(eq(users.id, user.id));

    // Send verification email
    const emailSent = await sendVerificationEmail(
      email,
      verificationToken,
      user.displayName || undefined
    );

    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send verification email" });
    }

    console.log('[AUTH] Verification email resent to:', email);

    return res.status(200).json({
      success: true,
      message: "Verification email has been sent. Please check your inbox.",
    });
  } catch (error) {
    console.error('[AUTH] Resend verification error:', error);
    return res.status(500).json({ error: "Failed to resend verification email" });
  }
});

/**
 * Update login endpoint to check email verification
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if email is verified
    if (user.emailVerified !== 1) {
      return res.status(403).json({
        error: "Email not verified",
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        needsVerification: true,
      });
    }

    // Clear the explicitLogout flag when user logs in
    delete req.session.explicitLogout;

    // Set session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.displayName || user.email;
    req.session.photoURL = user.photoURL || null;

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    // Save session
    return req.session.save((err) => {
      if (err) {
        console.error('[AUTH] Session save error:', err);
        return res.status(500).json({ error: "Login failed" });
      }

      console.log('[AUTH] User logged in successfully:', user.email);

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
      });
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return res.status(500).json({ error: "Login failed" });
  }
});

export default router;
