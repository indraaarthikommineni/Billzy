const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/plans - List all plans
router.get('/', (req, res) => {
  const db = getDatabase();
  const plans = db.prepare('SELECT * FROM plans WHERE is_active = 1 ORDER BY id ASC').all();
  return res.json({ plans });
});

// GET /api/plans/:id
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  return res.json({ plan });
});

// POST /api/plans - Admin creates a new plan
router.post('/', requireAdmin, (req, res) => {
  try {
    const {
      name,
      price,
      billing_frequency,
      min_quantity = 1,
      valid_from,
      valid_to,
      auto_close_at_end = 0,
      allow_early_close = 1,
      allow_pause = 1,
      allow_renewal = 1
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Plan name is required' });
    }

    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validFrequencies.includes(billing_frequency)) {
      return res.status(400).json({
        error: `Invalid billing frequency. Must be one of: ${validFrequencies.join(', ')}`
      });
    }

    if (!valid_from) {
      return res.status(400).json({ error: 'valid_from date is required (YYYY-MM-DD)' });
    }

    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO plans (
        name, price, billing_frequency, min_quantity, valid_from, valid_to,
        auto_close_at_end, allow_early_close, allow_pause, allow_renewal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      Number(price),
      billing_frequency,
      Number(min_quantity) || 1,
      valid_from,
      valid_to || null,
      auto_close_at_end ? 1 : 0,
      allow_early_close ? 1 : 0,
      allow_pause ? 1 : 0,
      allow_renewal ? 1 : 0
    );

    const newPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Plan created successfully',
      plan: newPlan
    });
  } catch (err) {
    console.error('Create plan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
