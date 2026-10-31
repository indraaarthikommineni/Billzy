const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireStaffOrAdmin } = require('../middleware/auth');
const { recordDiscountUsage } = require('../services/discountEngine');

router.use(authenticateToken);

// GET /api/invoices - List invoices
router.get('/', (req, res) => {
  const db = getDatabase();
  const { status, customer_id, overdue, limit = 100, offset = 0 } = req.query;
  const today = new Date().toISOString().split('T')[0];

  let query = `
    SELECT i.*, u.name as customer_name, u.email as customer_email, u.company_name,
           s.sub_number, (i.total_amount - i.paid_amount) as balance,
           CASE WHEN i.status != 'Paid' AND i.status != 'Cancelled' AND i.due_date < ? THEN 1 ELSE 0 END as is_overdue
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    JOIN subscriptions s ON i.subscription_id = s.id
    WHERE 1=1
  `;
  const params = [today];

  if (req.user.role === 'customer') {
    query += ' AND i.customer_id = ?';
    params.push(req.user.id);
  } else if (customer_id) {
    query += ' AND i.customer_id = ?';
    params.push(customer_id);
  }

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  if (overdue === 'true' || overdue === '1') {
    query += " AND i.status != 'Paid' AND i.status != 'Cancelled' AND i.due_date < ?";
    params.push(today);
  }

  query += ' ORDER BY i.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const invoices = db.prepare(query).all(...params);

  return res.json({ invoices });
});

// GET /api/invoices/:id - Detailed invoice view
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const invId = Number(req.params.id);
  const today = new Date().toISOString().split('T')[0];

  let query = `
    SELECT i.*, u.name as customer_name, u.email as customer_email, u.company_name,
           s.sub_number, s.payment_terms, (i.total_amount - i.paid_amount) as balance,
           CASE WHEN i.status != 'Paid' AND i.status != 'Cancelled' AND i.due_date < ? THEN 1 ELSE 0 END as is_overdue
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    JOIN subscriptions s ON i.subscription_id = s.id
    WHERE i.id = ?
  `;
  const params = [today, invId];

  if (req.user.role === 'customer') {
    query += ' AND i.customer_id = ?';
    params.push(req.user.id);
  }

  const invoice = db.prepare(query).get(...params);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // Fetch line items
  const lines = db.prepare(`
    SELECT il.*, p.name as product_name, pv.variant_name
    FROM invoice_lines il
    JOIN products p ON il.product_id = p.id
    LEFT JOIN product_variants pv ON il.variant_id = pv.id
    WHERE il.invoice_id = ?
  `).all(invId);

  // Fetch payment records
  const payments = db.prepare(`
    SELECT * FROM payments 
    WHERE invoice_id = ? 
    ORDER BY id ASC
  `).all(invId);

  // Fetch audit logs
  const auditLogs = db.prepare(`
    SELECT a.*, u.name as performed_by_name
    FROM audit_logs a
    LEFT JOIN users u ON a.performed_by = u.id
    WHERE a.entity_type = 'invoice' AND a.entity_id = ?
    ORDER BY a.id ASC
  `).all(invId);

  return res.json({
    invoice: {
      ...invoice,
      lines,
      payments,
      auditLogs
    }
  });
});

// POST /api/invoices/:id/confirm - Confirm invoice (Draft -> Confirmed)
router.post('/:id/confirm', requireStaffOrAdmin, (req, res) => {
  const db = getDatabase();
  const invId = Number(req.params.id);

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  if (invoice.status !== 'Draft') {
    return res.status(400).json({ error: `Cannot confirm invoice in '${invoice.status}' state. Only 'Draft' invoices can be confirmed.` });
  }

  db.transaction(() => {
    db.prepare("UPDATE invoices SET status = 'Confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(invId);
    db.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, details, performed_by)
      VALUES ('invoice', ?, 'status_changed', 'Invoice confirmed', ?)
    `).run(invId, req.user.id);

    // If subscription has a discount rule, record its usage
    const sub = db.prepare('SELECT discount_id FROM subscriptions WHERE id = ?').get(invoice.subscription_id);
    if (sub && sub.discount_id) {
      recordDiscountUsage(sub.discount_id);
    }
  })();

  const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId);
  return res.json({ message: 'Invoice confirmed successfully', invoice: updated });
});

// POST /api/invoices/:id/cancel - Cancel invoice
router.post('/:id/cancel', requireStaffOrAdmin, (req, res) => {
  const db = getDatabase();
  const invId = Number(req.params.id);

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  if (invoice.status === 'Paid') {
    return res.status(400).json({ error: 'Cannot cancel an invoice that has already been paid.' });
  }

  db.transaction(() => {
    db.prepare("UPDATE invoices SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(invId);
    db.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, details, performed_by)
      VALUES ('invoice', ?, 'status_changed', 'Invoice cancelled', ?)
    `).run(invId, req.user.id);
  })();

  const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId);
  return res.json({ message: 'Invoice cancelled', invoice: updated });
});

// POST /api/invoices/:id/send - Send invoice email to customer
router.post('/:id/send', requireStaffOrAdmin, (req, res) => {
  const db = getDatabase();
  const invId = Number(req.params.id);

  const invoice = db.prepare(`
    SELECT i.*, u.email as customer_email, u.name as customer_name 
    FROM invoices i
    JOIN users u ON i.customer_id = u.id
    WHERE i.id = ?
  `).get(invId);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const nowStr = new Date().toISOString();
  db.prepare('UPDATE invoices SET sent_at = ? WHERE id = ?').run(nowStr, invId);
  db.prepare(`
    INSERT INTO audit_logs (entity_type, entity_id, action, details, performed_by)
    VALUES ('invoice', ?, 'sent', ?, ?)
  `).run(invId, `Dispatched invoice to ${invoice.customer_email}`, req.user.id);

  return res.json({
    message: `Invoice ${invoice.invoice_number} successfully sent to ${invoice.customer_email}`,
    sentAt: nowStr
  });
});

module.exports = router;
