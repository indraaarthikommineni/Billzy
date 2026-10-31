const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDatabase } = require('../config/database');
const { validatePassword, validateEmail } = require('../middleware/validation');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/signup - New customer account creation
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, company_name } = req.body;

    // Validate email
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.message });
    }

    // Validate password policy (>8 chars, uppercase, lowercase, special char)
    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.message });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, name, company_name, role)
      VALUES (?, ?, ?, ?, 'customer')
    `);

    const result = stmt.run(cleanEmail, passwordHash, name.trim(), company_name ? company_name.trim() : null);
    const newUser = db.prepare('SELECT id, email, name, company_name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      company_name: user.company_name,
      role: user.role,
      created_at: user.created_at
    };

    return res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me - Current user details
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

// POST /api/auth/forgot-password - Send password reset link
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      // Security best practice: don't reveal non-existent emails, return success message
      return res.json({
        message: 'If an account exists with this email, a password reset link has been dispatched.',
        resetLinkSimulated: null
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(resetToken, expires, user.id);

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

    return res.json({
      message: 'If an account exists with this email, a password reset link has been dispatched.',
      // Provided in API response for automated testing & development convenience
      resetToken,
      resetLink
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password - Verify token and set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    const passCheck = validatePassword(new_password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.message });
    }

    const db = getDatabase();
    const nowStr = new Date().toISOString();

    const user = db.prepare(`
      SELECT id, email, name FROM users 
      WHERE reset_token = ? AND reset_token_expires > ?
    `).get(token, nowStr);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(new_password, salt);

    db.prepare(`
      UPDATE users 
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, user.id);

    return res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
