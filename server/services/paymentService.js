const { getDatabase } = require('../config/database');

function generatePaymentNumber() {
  const db = getDatabase();
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;

  const lastPay = db.prepare(`
    SELECT payment_number FROM payments 
    WHERE payment_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastPay) {
    const parts = lastPay.payment_number.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) {
      nextSeq = seq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Record a payment against an invoice.
 * Supports partial payments and full payments. Automatically updates invoice status to Paid when fully settled.
 */
function recordPayment({ invoiceId, amount, paymentMethod, paymentDate, note, referenceNo, userId }) {
  const db = getDatabase();

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }

  if (invoice.status === 'Cancelled') {
    throw new Error('Cannot record payment on a cancelled invoice.');
  }

  const numAmount = Number(Number(amount).toFixed(2));
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Payment amount must be a positive number greater than 0.');
  }

  const remainingBalance = Number((invoice.total_amount - invoice.paid_amount).toFixed(2));
  if (numAmount > remainingBalance) {
    throw new Error(`Payment amount ($${numAmount.toFixed(2)}) exceeds remaining balance of $${remainingBalance.toFixed(2)}.`);
  }

  const paymentNumber = generatePaymentNumber();
  const dateStr = paymentDate ? new Date(paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const validMethods = ['credit_card', 'bank_transfer', 'stripe', 'paypal', 'cash', 'check'];
  if (!validMethods.includes(paymentMethod)) {
    throw new Error(`Invalid payment method '${paymentMethod}'. Allowed: ${validMethods.join(', ')}`);
  }

  let createdPayment = null;
  let updatedInvoice = null;

  db.transaction(() => {
    // 1. Insert payment record
    const payStmt = db.prepare(`
      INSERT INTO payments (
        payment_number, invoice_id, customer_id, payment_method,
        amount, payment_date, reference_no, note, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = payStmt.run(
      paymentNumber,
      invoice.id,
      invoice.customer_id,
      paymentMethod,
      numAmount,
      dateStr,
      referenceNo || null,
      note || null,
      userId || null
    );

    const paymentId = result.lastInsertRowid;

    // 2. Update invoice paid_amount and status
    const newPaidAmount = Number((invoice.paid_amount + numAmount).toFixed(2));
    const isFullyPaid = newPaidAmount >= invoice.total_amount;
    const newStatus = isFullyPaid ? 'Paid' : invoice.status;

    db.prepare(`
      UPDATE invoices 
      SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPaidAmount, newStatus, invoice.id);

    // 3. Log audit event
    db.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, details, performed_by)
      VALUES ('payment', ?, 'recorded', ?, ?)
    `).run(paymentId, `Recorded ${paymentMethod} payment of $${numAmount.toFixed(2)} on invoice ${invoice.invoice_number}`, userId);

    createdPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    updatedInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id);
  })();

  return {
    payment: createdPayment,
    invoice: updatedInvoice,
    remainingBalance: Number((updatedInvoice.total_amount - updatedInvoice.paid_amount).toFixed(2))
  };
}

module.exports = {
  generatePaymentNumber,
  recordPayment
};
