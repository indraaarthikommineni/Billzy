const { getDatabase } = require('../config/database');
const { calculateTax } = require('./taxEngine');
const { evaluateDiscount } = require('./discountEngine');

// Generates sequential invoice number: e.g. INV-2026-0001
function generateInvoiceNumber() {
  const db = getDatabase();
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastInv = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastInv) {
    const parts = lastInv.invoice_number.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) {
      nextSeq = seq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// Compute the end date of a billing cycle and the next billing start date
function computeNextBillingDates(startDateStr, frequency) {
  const start = new Date(startDateStr);
  let nextDate = new Date(start);

  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  const periodEnd = new Date(nextDate);
  periodEnd.setDate(periodEnd.getDate() - 1);

  return {
    periodStart: start.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    nextBillingDate: nextDate.toISOString().split('T')[0]
  };
}

// Compute invoice due date based on payment terms
function computeDueDate(issueDateStr, paymentTerms) {
  const issueDate = new Date(issueDateStr);
  let daysToAdd = 0;

  switch (paymentTerms) {
    case 'Immediate':
      daysToAdd = 0;
      break;
    case 'Net 15':
      daysToAdd = 15;
      break;
    case 'Net 30':
      daysToAdd = 30;
      break;
    case 'Net 60':
      daysToAdd = 60;
      break;
    default:
      daysToAdd = 15;
  }

  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + daysToAdd);
  return dueDate.toISOString().split('T')[0];
}

/**
 * Generates an invoice for a specific subscription.
 * Idempotent: If an invoice for the current period already exists, it is returned without duplicate creation.
 */
function generateInvoiceForSubscription(subscriptionId, asOfDate = new Date(), options = {}) {
  const db = getDatabase();

  const sub = db.prepare(`
    SELECT s.*, p.billing_frequency, p.auto_close_at_end, u.email as customer_email, u.name as customer_name
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    JOIN users u ON s.customer_id = u.id
    WHERE s.id = ?
  `).get(subscriptionId);

  if (!sub) {
    throw new Error(`Subscription #${subscriptionId} not found`);
  }

  if (sub.status !== 'Active') {
    throw new Error(`Cannot bill subscription in '${sub.status}' state. Only 'Active' subscriptions can be billed.`);
  }

  const periodStart = sub.next_billing_date;
  const { periodEnd, nextBillingDate } = computeNextBillingDates(periodStart, sub.billing_frequency);
  const issueDate = new Date(asOfDate).toISOString().split('T')[0];
  const dueDate = computeDueDate(issueDate, sub.payment_terms);

  // Check for duplicate invoice for this subscription & period
  const existingInvoice = db.prepare(`
    SELECT * FROM invoices 
    WHERE subscription_id = ? AND billing_period_start = ?
  `).get(subscriptionId, periodStart);

  if (existingInvoice) {
    return {
      created: false,
      invoice: existingInvoice,
      message: `Invoice ${existingInvoice.invoice_number} already exists for period ${periodStart} - skipped duplicate billing.`
    };
  }

  // Fetch lines
  const lines = db.prepare(`
    SELECT sl.*, p.name as product_name, pv.variant_name
    FROM subscription_lines sl
    JOIN products p ON sl.product_id = p.id
    LEFT JOIN product_variants pv ON sl.variant_id = pv.id
    WHERE sl.subscription_id = ?
  `).all(subscriptionId);

  if (lines.length === 0) {
    throw new Error(`Subscription #${sub.sub_number} has no product lines to bill.`);
  }

  // Calculate invoice line totals and taxes
  let subtotal = 0;
  let taxTotal = 0;

  const invoiceLinesToInsert = lines.map(line => {
    const lineSubtotal = Number((line.unit_price * line.quantity).toFixed(2));
    subtotal += lineSubtotal;

    const taxRes = calculateTax(line.tax_id, lineSubtotal);
    taxTotal += taxRes.amount;

    let desc = line.product_name;
    if (line.variant_name) {
      desc += ` (${line.variant_name})`;
    }

    return {
      product_id: line.product_id,
      variant_id: line.variant_id,
      description: desc,
      quantity: line.quantity,
      unit_price: line.unit_price,
      tax_rate: taxRes.rate,
      tax_amount: taxRes.amount,
      line_total: lineSubtotal + taxRes.amount
    };
  });

  // Evaluate Discount
  let discountAmount = 0;
  if (sub.discount_id) {
    const discRes = evaluateDiscount(sub.discount_id, lines, subtotal, issueDate);
    if (discRes.applies) {
      discountAmount = discRes.discountAmount;
    }
  }

  const finalSubtotal = Number(subtotal.toFixed(2));
  const finalTax = Number(taxTotal.toFixed(2));
  const finalDiscount = Number(discountAmount.toFixed(2));
  const totalAmount = Math.max(0, Number((finalSubtotal + finalTax - finalDiscount).toFixed(2)));

  const invoiceNumber = generateInvoiceNumber();

  let createdInvoice = null;

  // Execute database writes atomically in transaction
  db.transaction(() => {
    // 1. Insert Invoice
    const invStmt = db.prepare(`
      INSERT INTO invoices (
        invoice_number, subscription_id, customer_id, billing_period_start,
        billing_period_end, issue_date, due_date, status, subtotal,
        tax_amount, discount_amount, total_amount, paid_amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, 0, ?)
    `);

    const invResult = invStmt.run(
      invoiceNumber,
      subscriptionId,
      sub.customer_id,
      periodStart,
      periodEnd,
      issueDate,
      dueDate,
      finalSubtotal,
      finalTax,
      finalDiscount,
      totalAmount,
      `Recurring billing for ${sub.sub_number} (${periodStart} to ${periodEnd})`
    );

    const invoiceId = invResult.lastInsertRowid;

    // 2. Insert Invoice Lines
    const lineStmt = db.prepare(`
      INSERT INTO invoice_lines (
        invoice_id, product_id, variant_id, description, quantity,
        unit_price, tax_rate, tax_amount, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const line of invoiceLinesToInsert) {
      lineStmt.run(
        invoiceId,
        line.product_id,
        line.variant_id,
        line.description,
        line.quantity,
        line.unit_price,
        line.tax_rate,
        line.tax_amount,
        line.line_total
      );
    }

    // 3. Update Subscription billing dates
    // Check if subscription should auto-close when ended
    let newSubStatus = sub.status;
    if (sub.auto_close_at_end && sub.expiry_date && nextBillingDate > sub.expiry_date) {
      newSubStatus = 'Closed';
    }

    db.prepare(`
      UPDATE subscriptions 
      SET last_billed_date = ?, next_billing_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(periodStart, nextBillingDate, newSubStatus, subscriptionId);

    // 4. Log Audit Event
    db.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, details)
      VALUES ('invoice', ?, 'created', ?)
    `).run(invoiceId, `Generated recurring invoice ${invoiceNumber} for subscription ${sub.sub_number}`);

    createdInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  })();

  return {
    created: true,
    invoice: createdInvoice,
    message: `Invoice ${invoiceNumber} created successfully.`
  };
}

/**
 * Runs batch billing for all active subscriptions due on or before `asOfDate`.
 */
function runBatchBilling(asOfDate = new Date()) {
  const db = getDatabase();
  const dateStr = new Date(asOfDate).toISOString().split('T')[0];

  const dueSubscriptions = db.prepare(`
    SELECT id, sub_number, next_billing_date 
    FROM subscriptions 
    WHERE status = 'Active' AND next_billing_date <= ?
    ORDER BY id ASC
  `).all(dateStr);

  const results = {
    totalDue: dueSubscriptions.length,
    createdCount: 0,
    skippedCount: 0,
    invoices: [],
    errors: []
  };

  for (const sub of dueSubscriptions) {
    try {
      const res = generateInvoiceForSubscription(sub.id, dateStr);
      if (res.created) {
        results.createdCount++;
        results.invoices.push(res.invoice);
      } else {
        results.skippedCount++;
      }
    } catch (err) {
      results.errors.push({
        subscriptionId: sub.id,
        subNumber: sub.sub_number,
        error: err.message
      });
    }
  }

  return results;
}

module.exports = {
  generateInvoiceNumber,
  computeNextBillingDates,
  computeDueDate,
  generateInvoiceForSubscription,
  runBatchBilling
};
