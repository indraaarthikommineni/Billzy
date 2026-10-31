const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { evaluateDiscount } = require('../services/discountEngine');

router.use(authenticateToken);

// GET /api/discounts - List all discount rules
router.get('/', (req, res) => {
  const db = getDatabase();
  const discounts = db.prepare(`
    SELECT d.*, p.name as applicable_product_name
    FROM discount_rules d
    LEFT JOIN products p ON d.applicable_product_id = p.id
    ORDER BY d.id DESC
  `).all();
  return res.json({ discounts });
});

// GET /api/discounts/:id
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const discount = db.prepare('SELECT * FROM discount_rules WHERE id = ?').get(req.params.id);
  if (!discount) {
    return res.status(404).json({ error: 'Discount rule not found' });
  }
  return res.json({ discount });
});

// POST /api/discounts - Admin only creates discount rules
router.post('/', requireAdmin, (req, res) => {
  try {
    const {
      name,
      code,
      discount_type,
      discount_value,
      min_purchase_amount = 0,
      min_quantity = 0,
      start_date,
      end_date,
      max_uses = 0,
      scope = 'all',
      applicable_product_id
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Discount name is required' });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Discount promo code is required' });
    }

    if (!['fixed', 'percentage'].includes(discount_type)) {
      return res.status(400).json({ error: "Discount type must be either 'fixed' or 'percentage'" });
    }

    if (discount_value === undefined || isNaN(Number(discount_value)) || Number(discount_value) <= 0) {
      return res.status(400).json({ error: 'Valid discount value > 0 is required' });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required (YYYY-MM-DD)' });
    }

    if (start_date > end_date) {
      return res.status(400).json({ error: 'Start date cannot be after end date' });
    }

    if (!['all', 'product'].includes(scope)) {
      return res.status(400).json({ error: "Scope must be 'all' or 'product'" });
    }

    const db = getDatabase();
    const cleanCode = code.trim().toUpperCase();

    const existing = db.prepare('SELECT id FROM discount_rules WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(409).json({ error: `Discount rule with code '${cleanCode}' already exists` });
    }

    const stmt = db.prepare(`
      INSERT INTO discount_rules (
        name, code, discount_type, discount_value, min_purchase_amount,
        min_quantity, start_date, end_date, max_uses, scope, applicable_product_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name.trim(),
      cleanCode,
      discount_type,
      Number(discount_value),
      Number(min_purchase_amount || 0),
      Number(min_quantity || 0),
      start_date,
      end_date,
      Number(max_uses || 0),
      scope,
      scope === 'product' && applicable_product_id ? Number(applicable_product_id) : null
    );

    const newDiscount = db.prepare('SELECT * FROM discount_rules WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Discount rule created successfully',
      discount: newDiscount
    });
  } catch (err) {
    console.error('Create discount error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/discounts/evaluate - Test/preview discount applicability on lines
router.post('/evaluate', (req, res) => {
  try {
    const { discount_id, lines = [], subtotal = 0, reference_date } = req.body;
    const result = evaluateDiscount(discount_id, lines, subtotal, reference_date);
    return res.json({ result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
