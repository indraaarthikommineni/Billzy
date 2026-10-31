const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { transitionSubscriptionStatus } = require('../services/subscriptionService');

router.use(authenticateToken);

// GET /api/portal/overview - Customer portal summary
router.get('/overview', (req, res) => {
  const db = getDatabase();
  const customerId = req.user.id;

  // Active subscriptions count & list
  const activeSubs = db.prepare(`
    SELECT s.*, p.name as plan_name, p.billing_frequency, p.allow_pause, p.allow_early_close
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.customer_id = ? AND s.status = 'Active'
  `).all(customerId);

  // Invoices summary
  const invoiceStats = db.prepare(`
    SELECT 
      COUNT(*) as total_invoices,
      COALESCE(SUM(total_amount), 0) as total_billed,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(total_amount - paid_amount), 0) as pending_balance,
      COUNT(CASE WHEN status != 'Paid' AND status != 'Cancelled' THEN 1 END) as unpaid_count
    FROM invoices
    WHERE customer_id = ? AND status != 'Cancelled'
  `).get(customerId);

  // Recent unpaid invoices
  const unpaidInvoices = db.prepare(`
    SELECT * FROM invoices
    WHERE customer_id = ? AND status != 'Paid' AND status != 'Cancelled'
    ORDER BY due_date ASC
  `).all(customerId);

  return res.json({
    customer: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      company_name: req.user.company_name
    },
    activeSubscriptionsCount: activeSubs.length,
    activeSubscriptions: activeSubs,
    invoiceStats: {
      totalInvoices: invoiceStats.total_invoices,
      totalBilled: Number(invoiceStats.total_billed.toFixed(2)),
      totalPaid: Number(invoiceStats.total_paid.toFixed(2)),
      pendingBalance: Number(invoiceStats.pending_balance.toFixed(2)),
      unpaidCount: invoiceStats.unpaid_count
    },
    unpaidInvoices
  });
});

// GET /api/portal/subscriptions
router.get('/subscriptions', (req, res) => {
  const db = getDatabase();
  const customerId = req.user.id;

  const subscriptions = db.prepare(`
    SELECT s.*, p.name as plan_name, p.billing_frequency, p.allow_pause, p.allow_early_close
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.customer_id = ?
    ORDER BY s.id DESC
  `).all(customerId);

  return res.json({ subscriptions });
});

// GET /api/portal/invoices
router.get('/invoices', (req, res) => {
  const db = getDatabase();
  const customerId = req.user.id;

  const invoices = db.prepare(`
    SELECT i.*, s.sub_number, (i.total_amount - i.paid_amount) as balance
    FROM invoices i
    JOIN subscriptions s ON i.subscription_id = s.id
    WHERE i.customer_id = ?
    ORDER BY i.id DESC
  `).all(customerId);

  return res.json({ invoices });
});

// GET /api/portal/payments
router.get('/payments', (req, res) => {
  const db = getDatabase();
  const customerId = req.user.id;

  const payments = db.prepare(`
    SELECT p.*, i.invoice_number
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    WHERE p.customer_id = ?
    ORDER BY p.id DESC
  `).all(customerId);

  return res.json({ payments });
});

// POST /api/portal/subscriptions/:id/pause - Customer pauses their own subscription
router.post('/subscriptions/:id/pause', (req, res) => {
  try {
    const db = getDatabase();
    const subId = Number(req.params.id);

    const sub = db.prepare('SELECT customer_id FROM subscriptions WHERE id = ?').get(subId);
    if (!sub || sub.customer_id !== req.user.id) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const updated = transitionSubscriptionStatus(subId, 'Paused', req.user.id);
    return res.json({
      message: 'Subscription successfully paused.',
      subscription: updated
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/portal/subscriptions/:id/resume - Customer resumes their paused subscription
router.post('/subscriptions/:id/resume', (req, res) => {
  try {
    const db = getDatabase();
    const subId = Number(req.params.id);

    const sub = db.prepare('SELECT customer_id FROM subscriptions WHERE id = ?').get(subId);
    if (!sub || sub.customer_id !== req.user.id) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const updated = transitionSubscriptionStatus(subId, 'Active', req.user.id);
    return res.json({
      message: 'Subscription successfully resumed and is now Active.',
      subscription: updated
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/portal/subscriptions/:id/cancel - Customer cancels their own subscription
router.post('/subscriptions/:id/cancel', (req, res) => {
  try {
    const db = getDatabase();
    const subId = Number(req.params.id);

    const sub = db.prepare('SELECT customer_id FROM subscriptions WHERE id = ?').get(subId);
    if (!sub || sub.customer_id !== req.user.id) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const updated = transitionSubscriptionStatus(subId, 'Closed', req.user.id);
    return res.json({
      message: 'Subscription successfully closed/cancelled.',
      subscription: updated
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
