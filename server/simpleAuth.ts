import { Router } from 'express';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter email and password' 
      });
    }

    // Query user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Check if user exists
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if password is set
    if (!user.password) {
      return res.status(401).json({ 
        success: false, 
        message: 'This account has no password set, please use another login method' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified === 1
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error, please try again later' 
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter email and password' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = jwt.sign(
      { email: email.toLowerCase(), type: 'email-verification' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set token expiry (24 hours from now)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName: displayName || email.split('@')[0],
        emailVerified: 0, // Default unverified
        verificationToken: verificationToken,
        verificationTokenExpiry: expiryDate
      })
      .returning();

    // Send verification email
    const { sendVerificationEmail } = await import('./emailService');
    await sendVerificationEmail(newUser.email, verificationToken, newUser.displayName || undefined);
    
    console.log('[AUTH] Verification email sent to:', newUser.email);

    // Generate JWT token for login
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        photoURL: newUser.photoURL,
        emailVerified: false
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error, please try again later' 
    });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    // Query user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return user info
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified === 1
      }
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired authentication token' 
    });
  }
});

// Forgot password - Send reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter your email address' 
      });
    }

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // For security, return the same message whether user exists or not
    res.json({
      success: true,
      message: 'If this email is registered, you will receive a password reset link'
    });

    // Send reset email if user exists
    if (user) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, type: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Set token expiry (1 hour from now)
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);

      // Save reset token to database
      await db
        .update(users)
        .set({
          resetPasswordToken: resetToken,
          resetPasswordTokenExpiry: expiryDate
        })
        .where(eq(users.id, user.id));

      // Send password reset email
      const { sendPasswordResetEmail } = await import('./emailService');
      await sendPasswordResetEmail(user.email, resetToken, user.displayName || undefined);
      
      console.log('[AUTH] Password reset email sent to:', user.email);
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error, please try again later' 
    });
  }
});

export default router;

// Reset password - Verify token and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; type: string };
      
      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Find user with this reset token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if token matches and hasn't expired
    if (user.resetPasswordToken !== token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset token' 
      });
    }

    if (user.resetPasswordTokenExpiry && new Date() > new Date(user.resetPasswordTokenExpiry)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reset token has expired. Please request a new one.' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null
      })
      .where(eq(users.id, user.id));

    console.log('[AUTH] Password reset successful for user:', user.email);

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error, please try again later' 
    });
  }
});
