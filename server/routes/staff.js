const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');
const { validatePassword, validateEmail } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All staff endpoints require authentication
router.use(authenticateToken);

// GET /api/staff - List all staff members (admin only)
router.get('/', requireAdmin, (req, res) => {
  const db = getDatabase();
  const staff = db.prepare(`
    SELECT id, email, name, role, created_at 
    FROM users 
    WHERE role IN ('staff', 'admin')
    ORDER BY id ASC
  `).all();
  return res.json({ staff });
});

// POST /api/staff - "Only the admin can add a new member of staff."
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role = 'staff' } = req.body;

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.message });
    }

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.message });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!['staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: "Staff role must be either 'staff' or 'admin'" });
    }

    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run(cleanEmail, passwordHash, name.trim(), role);

    const newStaff = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: `Staff member ${newStaff.name} created successfully`,
      staff: newStaff
    });
  } catch (err) {
    console.error('Create staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/staff/:id - Remove staff member
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDatabase();
  const staffId = Number(req.params.id);

  if (staffId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' });
  }

  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(staffId);
  if (!user || user.role === 'customer') {
    return res.status(404).json({ error: 'Staff member not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(staffId);
  return res.json({ message: 'Staff member removed successfully' });
});

module.exports = router;
