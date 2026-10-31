const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/taxes - List tax rules
router.get('/', (req, res) => {
  const db = getDatabase();
  const taxes = db.prepare('SELECT * FROM tax_rules WHERE is_active = 1 ORDER BY id ASC').all();
  return res.json({ taxes });
});

// POST /api/taxes - Admin creates a tax rule
router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, rate, code } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tax name is required' });
    }

    if (rate === undefined || isNaN(Number(rate)) || Number(rate) < 0) {
      return res.status(400).json({ error: 'Valid tax rate (e.g. 10.0 for 10%) is required' });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Tax code is required' });
    }

    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO tax_rules (name, rate, code)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(name.trim(), Number(rate), code.trim().toUpperCase());
    const newTax = db.prepare('SELECT * FROM tax_rules WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Tax rule created successfully',
      tax: newTax
    });
  } catch (err) {
    console.error('Create tax error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
