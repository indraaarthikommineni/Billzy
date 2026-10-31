const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireStaffOrAdmin } = require('../middleware/auth');
const {
  generateSubscriptionNumber,
  calculateSubscriptionTotals,
  transitionSubscriptionStatus
} = require('../services/subscriptionService');

router.use(authenticateToken);

// GET /api/subscriptions - List subscriptions with optional filtering
router.get('/', (req, res) => {
  const db = getDatabase();
  const { status, customer_id, plan_id, search, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT s.*, u.name as customer_name, u.email as customer_email, u.company_name,
           p.name as plan_name, p.billing_frequency, p.price as plan_price,
           d.name as discount_name, d.code as discount_code
    FROM subscriptions s
    JOIN users u ON s.customer_id = u.id
    JOIN plans p ON s.plan_id = p.id
    LEFT JOIN discount_rules d ON s.discount_id = d.id
    WHERE 1=1
  `;
  const params = [];

  // Scoped access: Customers only see their own subscriptions
  if (req.user.role === 'customer') {
    query += ' AND s.customer_id = ?';
    params.push(req.user.id);
  } else if (customer_id) {
    query += ' AND s.customer_id = ?';
    params.push(customer_id);
  }

  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }

  if (plan_id) {
    query += ' AND s.plan_id = ?';
    params.push(plan_id);
  }

  if (search) {
    query += ' AND (s.sub_number LIKE ? OR u.name LIKE ? OR u.company_name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const subscriptions = db.prepare(query).all(...params);

  return res.json({ subscriptions });
});

// GET /api/subscriptions/:id - Full subscription details
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const subId = Number(req.params.id);

  let query = `
    SELECT s.*, u.name as customer_name, u.email as customer_email, u.company_name,
           p.name as plan_name, p.billing_frequency, p.price as plan_price,
           p.auto_close_at_end, p.allow_early_close, p.allow_pause, p.allow_renewal,
           d.name as discount_name, d.code as discount_code, d.discount_type, d.discount_value
    FROM subscriptions s
    JOIN users u ON s.customer_id = u.id
    JOIN plans p ON s.plan_id = p.id
    LEFT JOIN discount_rules d ON s.discount_id = d.id
    WHERE s.id = ?
  `;
  const params = [subId];

  if (req.user.role === 'customer') {
    query += ' AND s.customer_id = ?';
    params.push(req.user.id);
  }

  const subscription = db.prepare(query).get(...params);
  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  // Fetch line items
  const lines = db.prepare(`
    SELECT sl.*, p.name as product_name, p.type as product_type, pv.variant_name, pv.price_modifier,
           t.name as tax_name, t.code as tax_code
    FROM subscription_lines sl
    JOIN products p ON sl.product_id = p.id
    LEFT JOIN product_variants pv ON sl.variant_id = pv.id
    LEFT JOIN tax_rules t ON sl.tax_id = t.id
    WHERE sl.subscription_id = ?
  `).all(subId);

  // Fetch associated invoices
  const invoices = db.prepare(`
    SELECT * FROM invoices 
    WHERE subscription_id = ?
    ORDER BY id DESC
  `).all(subId);

  // Fetch audit history
  const auditLogs = db.prepare(`
    SELECT a.*, u.name as performed_by_name
    FROM audit_logs a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.entity_type = 'subscription' AND a.entity_id = ?
    ORDER BY a.id ASC
  `).all(subId);

  return res.json({
    subscription: {
      ...subscription,
      lines,
      invoices,
      auditLogs
    }
  });
});

// POST /api/subscriptions - Create new quote/subscription (staff/admin)
router.post('/', requireStaffOrAdmin, (req, res) => {
  try {
    const {
      customer_id,
      plan_id,
      template_id,
      start_date,
      expiry_date,
      payment_terms = 'Net 15',
      discount_id,
      notes,
      lines = []
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' });
    }

    const db = getDatabase();
    const customer = db.prepare('SELECT id, name FROM users WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    let finalPlanId = plan_id;
    let finalLines = lines;
    let quotationValidUntil = null;

    // If instantiated from quotation template
    if (template_id) {
      const template = db.prepare('SELECT * FROM quotation_templates WHERE id = ?').get(template_id);
      if (!template) {
        return res.status(404).json({ error: 'Quotation template not found' });
      }
      finalPlanId = finalPlanId || template.plan_id;

      const validDays = template.validity_days || 30;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);
      quotationValidUntil = validUntil.toISOString().split('T')[0];

      if (!lines || lines.length === 0) {
        const tLines = db.prepare('SELECT * FROM quotation_template_lines WHERE template_id = ?').all(template_id);
        finalLines = tLines.map(tl => ({
          product_id: tl.product_id,
          variant_id: tl.variant_id,
          quantity: tl.quantity,
          tax_id: tl.tax_id
        }));
      }
    }

    if (!finalPlanId) {
      return res.status(400).json({ error: 'Plan is required' });
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(finalPlanId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (!finalLines || finalLines.length === 0) {
      return res.status(400).json({ error: 'At least one product line item is required' });
    }

    const startDateStr = start_date || new Date().toISOString().split('T')[0];
    const subNumber = generateSubscriptionNumber();

    // Calculate totals, line items, taxes, discounts
    const totals = calculateSubscriptionTotals(finalLines, discount_id, plan.price, startDateStr);

    let createdId = null;

    db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO subscriptions (
          sub_number, customer_id, plan_id, status, start_date, expiry_date,
          quotation_valid_until, payment_terms, next_billing_date,
          subtotal, tax_amount, discount_amount, total_amount, discount_id, notes
        ) VALUES (?, ?, ?, 'Quotation', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        subNumber,
        customer_id,
        finalPlanId,
        startDateStr,
        expiry_date || null,
        quotationValidUntil,
        payment_terms,
        startDateStr, // next billing starts on start_date
        totals.subtotal,
        totals.tax_amount,
        totals.discount_amount,
        totals.total_amount,
        discount_id || null,
        notes || null
      );

      createdId = result.lastInsertRowid;

      // Insert subscription lines
      const lineStmt = db.prepare(`
        INSERT INTO subscription_lines (
          subscription_id, product_id, variant_id, quantity,
          unit_price, tax_id, tax_rate, tax_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const line of totals.lines) {
        lineStmt.run(
          createdId,
          line.product_id,
          line.variant_id,
          line.quantity,
          line.unit_price,
          line.tax_id,
          line.tax_rate,
          line.tax_amount,
          line.line_total
        );
      }

      // Log audit
      db.prepare(`
        INSERT INTO audit_logs (entity_type, entity_id, action, details, performed_by)
        VALUES ('subscription', ?, 'created', ?, ?)
      `).run(createdId, `Created quotation ${subNumber} for customer ${customer.name}`, req.user.id);
    })();

    const fullSub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(createdId);

    return res.status(201).json({
      message: `Subscription ${subNumber} created successfully in Quotation state`,
      subscription: fullSub
    });
  } catch (err) {
    console.error('Create subscription error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/:id/transition - Advance lifecycle state
router.post('/:id/transition', requireStaffOrAdmin, (req, res) => {
  try {
    const subId = Number(req.params.id);
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({ error: 'Target status is required' });
    }

    const updated = transitionSubscriptionStatus(subId, newStatus, req.user.id);
    return res.json({
      message: `Subscription status transitioned to ${newStatus}`,
      subscription: updated
    });
  } catch (err) {
    console.error('Transition subscription error:', err);
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
