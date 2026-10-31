const { getDatabase } = require('../config/database');
const { calculateTax } = require('./taxEngine');
const { evaluateDiscount } = require('./discountEngine');

// Generates formatted sequence number: e.g. SUB-2026-0001
function generateSubscriptionNumber() {
  const db = getDatabase();
  const year = new Date().getFullYear();
  const prefix = `SUB-${year}-`;
  
  const lastSub = db.prepare(`
    SELECT sub_number FROM subscriptions 
    WHERE sub_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

  let nextSeq = 1;
  if (lastSub) {
    const parts = lastSub.sub_number.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) {
      nextSeq = seq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// Allowed state transitions:
// Draft -> Quotation -> Confirmed -> Active -> Closed
// Active <-> Paused (if plan allows pause)
// Confirmed -> Cancelled/Closed
// Any -> Closed (if plan allows early close or expired)
const ALLOWED_TRANSITIONS = {
  'Draft': ['Quotation', 'Closed'],
  'Quotation': ['Draft', 'Confirmed', 'Closed'],
  'Confirmed': ['Active', 'Closed'],
  'Active': ['Paused', 'Closed'],
  'Paused': ['Active', 'Closed'],
  'Closed': ['Draft'] // Allow renewal/cloning into draft if plan allows
};

/**
 * Calculates totals for subscription lines, taxes, and applied discount
 */
function calculateSubscriptionTotals(lines, discountId, planPrice = 0, referenceDate = new Date()) {
  const db = getDatabase();
  let subtotal = 0;
  let taxTotal = 0;

  const processedLines = lines.map(line => {
    // 1. Fetch product and variant price modifier
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(line.product_id);
    if (!product) {
      throw new Error(`Product with ID ${line.product_id} not found`);
    }

    let unitPrice = line.unit_price !== undefined ? Number(line.unit_price) : product.sales_price;

    let variant = null;
    if (line.variant_id) {
      variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(line.variant_id);
      if (variant) {
        // e.g. Odoo brand adds +560.00
        unitPrice += Number(variant.price_modifier);
      }
    }

    const qty = Number(line.quantity) || 1;
    const lineSubtotal = Number((unitPrice * qty).toFixed(2));
    subtotal += lineSubtotal;

    // Tax calculation
    const taxRes = calculateTax(line.tax_id, lineSubtotal);
    taxTotal += taxRes.amount;

    return {
      product_id: product.id,
      variant_id: variant ? variant.id : null,
      product_name: product.name,
      variant_name: variant ? variant.variant_name : null,
      quantity: qty,
      unit_price: unitPrice,
      tax_id: taxRes.taxId,
      tax_rate: taxRes.rate,
      tax_amount: taxRes.amount,
      line_total: lineSubtotal + taxRes.amount
    };
  });

  // Evaluate discount
  let discountAmount = 0;
  let appliedDiscount = null;
  if (discountId) {
    const discRes = evaluateDiscount(discountId, processedLines, subtotal, referenceDate);
    if (discRes.applies) {
      discountAmount = discRes.discountAmount;
      appliedDiscount = discRes;
    }
  }

  const finalSubtotal = Number(subtotal.toFixed(2));
  const finalTax = Number(taxTotal.toFixed(2));
  const finalDiscount = Number(discountAmount.toFixed(2));
  const totalAmount = Math.max(0, Number((finalSubtotal + finalTax - finalDiscount).toFixed(2)));

  return {
    lines: processedLines,
    subtotal: finalSubtotal,
    tax_amount: finalTax,
    discount_amount: finalDiscount,
    total_amount: totalAmount,
    appliedDiscount
  };
}

/**
 * Validate and transition subscription state
 */
function transitionSubscriptionStatus(subscriptionId, newStatus, userId = null) {
  const db = getDatabase();
  const sub = db.prepare(`
    SELECT s.*, p.allow_early_close, p.allow_pause, p.allow_renewal, p.auto_close_at_end 
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.id = ?
  `).get(subscriptionId);

  if (!sub) {
    throw new Error('Subscription not found');
  }

  const currentStatus = sub.status;
  if (currentStatus === newStatus) {
    return sub;
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowed.join(', ')}]`);
  }

  // Check Plan Policy Rules:
  // 1. Pausing
  if (newStatus === 'Paused' && !sub.allow_pause) {
    throw new Error('This plan does not permit pausing subscriptions.');
  }

  // 2. Early close check
  if (newStatus === 'Closed' && currentStatus === 'Active') {
    const isExpired = sub.expiry_date && new Date(sub.expiry_date) <= new Date();
    if (!isExpired && !sub.allow_early_close) {
      throw new Error('This plan does not allow closing subscriptions before their expiry date.');
    }
  }

  // 3. Renewing check
  if (currentStatus === 'Closed' && newStatus === 'Draft' && !sub.allow_renewal) {
    throw new Error('This plan does not permit renewing expired subscriptions.');
  }

  // Perform transition in transaction
  const updateStmt = db.prepare(`
    UPDATE subscriptions 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);

  const auditStmt = db.prepare(`
    INSERT INTO audit_logs (entity_type, entity_id, action, details, performed_by)
    VALUES ('subscription', ?, 'status_changed', ?, ?)
  `);

  db.transaction(() => {
    updateStmt.run(newStatus, subscriptionId);
    auditStmt.run(subscriptionId, `Status transitioned from ${currentStatus} to ${newStatus}`, userId);
  })();

  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscriptionId);
}

module.exports = {
  generateSubscriptionNumber,
  calculateSubscriptionTotals,
  transitionSubscriptionStatus,
  ALLOWED_TRANSITIONS
};
