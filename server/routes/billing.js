const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireStaffOrAdmin } = require('../middleware/auth');
const { runBatchBilling, generateInvoiceForSubscription } = require('../services/billingEngine');

router.use(authenticateToken);
router.use(requireStaffOrAdmin);

// GET /api/billing/due - Preview subscriptions that are due for billing
router.get('/due', (req, res) => {
  const db = getDatabase();
  const asOfDate = req.query.as_of_date || new Date().toISOString().split('T')[0];

  const dueSubscriptions = db.prepare(`
    SELECT s.*, u.name as customer_name, u.email as customer_email, u.company_name,
           p.name as plan_name, p.billing_frequency
    FROM subscriptions s
    JOIN users u ON s.customer_id = u.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'Active' AND s.next_billing_date <= ?
    ORDER BY s.next_billing_date ASC
  `).all(asOfDate);

  return res.json({
    asOfDate,
    count: dueSubscriptions.length,
    dueSubscriptions
  });
});

// POST /api/billing/run - Execute automated batch billing
router.post('/run', (req, res) => {
  try {
    const asOfDate = req.body.as_of_date || new Date().toISOString().split('T')[0];
    const results = runBatchBilling(asOfDate);

    return res.json({
      message: `Batch billing complete. Generated ${results.createdCount} invoices, skipped ${results.skippedCount} (already billed).`,
      results
    });
  } catch (err) {
    console.error('Batch billing error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/subscription/:id - Generate invoice for a specific subscription
router.post('/subscription/:id', (req, res) => {
  try {
    const subId = Number(req.params.id);
    const asOfDate = req.body.as_of_date || new Date().toISOString().split('T')[0];

    const result = generateInvoiceForSubscription(subId, asOfDate);
    return res.json(result);
  } catch (err) {
    console.error('Single subscription billing error:', err);
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
