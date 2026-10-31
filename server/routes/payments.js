const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireStaffOrAdmin } = require('../middleware/auth');
const { recordPayment } = require('../services/paymentService');

router.use(authenticateToken);

// GET /api/payments - List payments
router.get('/', (req, res) => {
  const db = getDatabase();
  const { invoice_id, customer_id, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT p.*, i.invoice_number, i.total_amount as invoice_total,
           u.name as customer_name, u.email as customer_email, u.company_name
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    JOIN users u ON p.customer_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'customer') {
    query += ' AND p.customer_id = ?';
    params.push(req.user.id);
  } else if (customer_id) {
    query += ' AND p.customer_id = ?';
    params.push(customer_id);
  }

  if (invoice_id) {
    query += ' AND p.invoice_id = ?';
    params.push(invoice_id);
  }

  query += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const payments = db.prepare(query).all(...params);
  return res.json({ payments });
});

// POST /api/payments - Record a payment against an invoice (Staff/Admin)
router.post('/', requireStaffOrAdmin, (req, res) => {
  try {
    const {
      invoice_id,
      amount,
      payment_method,
      payment_date,
      note,
      reference_no
    } = req.body;

    if (!invoice_id) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payment amount > 0 is required' });
    }

    if (!payment_method) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    const result = recordPayment({
      invoiceId: invoice_id,
      amount,
      paymentMethod: payment_method,
      paymentDate: payment_date,
      note,
      referenceNo: reference_no,
      userId: req.user.id
    });

    return res.status(201).json({
      message: `Payment of $${Number(amount).toFixed(2)} recorded successfully`,
      ...result
    });
  } catch (err) {
    console.error('Record payment error:', err);
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/payments/methods - List valid payment methods
router.get('/methods', (req, res) => {
  return res.json({
    methods: [
      { id: 'credit_card', label: 'Credit Card' },
      { id: 'bank_transfer', label: 'Bank Transfer' },
      { id: 'stripe', label: 'Stripe' },
      { id: 'paypal', label: 'PayPal' },
      { id: 'cash', label: 'Cash' },
      { id: 'check', label: 'Check' }
    ]
  });
});

module.exports = router;
