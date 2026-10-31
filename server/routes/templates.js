const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireStaffOrAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/templates - List all quotation templates
router.get('/', (req, res) => {
  const db = getDatabase();
  const templates = db.prepare(`
    SELECT qt.*, p.name as plan_name, p.price as plan_price, p.billing_frequency
    FROM quotation_templates qt
    JOIN plans p ON qt.plan_id = p.id
    ORDER BY qt.id DESC
  `).all();

  const lines = db.prepare(`
    SELECT qtl.*, prod.name as product_name, prod.sales_price, pv.variant_name, pv.price_modifier
    FROM quotation_template_lines qtl
    JOIN products prod ON qtl.product_id = prod.id
    LEFT JOIN product_variants pv ON qtl.variant_id = pv.id
  `).all();

  const linesMap = {};
  for (const l of lines) {
    if (!linesMap[l.template_id]) linesMap[l.template_id] = [];
    linesMap[l.template_id].push(l);
  }

  const result = templates.map(t => ({
    ...t,
    lines: linesMap[t.id] || []
  }));

  return res.json({ templates: result });
});

// GET /api/templates/:id
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const template = db.prepare(`
    SELECT qt.*, p.name as plan_name, p.price as plan_price, p.billing_frequency
    FROM quotation_templates qt
    JOIN plans p ON qt.plan_id = p.id
    WHERE qt.id = ?
  `).get(req.params.id);

  if (!template) {
    return res.status(404).json({ error: 'Quotation template not found' });
  }

  const lines = db.prepare(`
    SELECT qtl.*, prod.name as product_name, prod.sales_price, pv.variant_name, pv.price_modifier,
           t.name as tax_name, t.rate as tax_rate
    FROM quotation_template_lines qtl
    JOIN products prod ON qtl.product_id = prod.id
    LEFT JOIN product_variants pv ON qtl.variant_id = pv.id
    LEFT JOIN tax_rules t ON qtl.tax_id = t.id
    WHERE qtl.template_id = ?
  `).all(template.id);

  return res.json({ template: { ...template, lines } });
});

// POST /api/templates - Create quotation template
router.post('/', requireStaffOrAdmin, (req, res) => {
  try {
    const { name, plan_id, validity_days = 30, notes, lines = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    if (!plan_id) {
      return res.status(400).json({ error: 'Plan is required' });
    }

    const db = getDatabase();
    const plan = db.prepare('SELECT id FROM plans WHERE id = ?').get(plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Selected plan not found' });
    }

    let createdId = null;

    db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO quotation_templates (name, plan_id, validity_days, notes)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(name.trim(), plan_id, Number(validity_days) || 30, notes || null);
      createdId = result.lastInsertRowid;

      if (Array.isArray(lines) && lines.length > 0) {
        const lineStmt = db.prepare(`
          INSERT INTO quotation_template_lines (template_id, product_id, variant_id, quantity, discount_id, tax_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const l of lines) {
          lineStmt.run(
            createdId,
            l.product_id,
            l.variant_id || null,
            Number(l.quantity) || 1,
            l.discount_id || null,
            l.tax_id || null
          );
        }
      }
    })();

    const fullTemplate = db.prepare('SELECT * FROM quotation_templates WHERE id = ?').get(createdId);
    return res.status(201).json({
      message: 'Quotation template created successfully',
      template: fullTemplate
    });
  } catch (err) {
    console.error('Create template error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
