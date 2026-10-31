const { getDatabase } = require('../config/database');

/**
 * Evaluates whether a discount rule applies to given subscription lines/totals.
 * @param {number|object} discountOrId - Discount rule object or ID
 * @param {Array} lines - Array of subscription/invoice lines [{ product_id, quantity, unit_price, line_total }]
 * @param {number} subtotal - Pre-discount subtotal
 * @param {string|Date} referenceDate - Date to check validity against (defaults to today)
 */
function evaluateDiscount(discountOrId, lines = [], subtotal = 0, referenceDate = new Date()) {
  const db = getDatabase();
  let discount = discountOrId;

  if (typeof discountOrId === 'number' || typeof discountOrId === 'string') {
    discount = db.prepare('SELECT * FROM discount_rules WHERE id = ?').get(discountOrId);
  }

  if (!discount || !discount.is_active) {
    return { applies: false, discountAmount: 0, reason: 'Discount rule not found or inactive' };
  }

  // 1. Check Date Range
  const refDateStr = new Date(referenceDate).toISOString().split('T')[0];
  if (refDateStr < discount.start_date) {
    return { applies: false, discountAmount: 0, reason: `Discount not active yet (starts ${discount.start_date})` };
  }
  if (refDateStr > discount.end_date) {
    return { applies: false, discountAmount: 0, reason: `Discount expired on ${discount.end_date}` };
  }

  // 2. Check Usage Limit
  if (discount.max_uses > 0 && discount.times_used >= discount.max_uses) {
    return { applies: false, discountAmount: 0, reason: `Discount usage limit reached (${discount.times_used}/${discount.max_uses})` };
  }

  // 3. Compute applicable base & quantities based on Scope
  let applicableBase = 0;
  let totalQuantity = 0;

  if (discount.scope === 'product' && discount.applicable_product_id) {
    // Only lines matching the product
    const matchingLines = lines.filter(l => Number(l.product_id) === Number(discount.applicable_product_id));
    applicableBase = matchingLines.reduce((sum, l) => sum + (l.line_total || (l.quantity * l.unit_price)), 0);
    totalQuantity = matchingLines.reduce((sum, l) => sum + Number(l.quantity), 0);

    if (matchingLines.length === 0) {
      return { applies: false, discountAmount: 0, reason: 'No eligible products for this discount' };
    }
  } else {
    // Whole subscription
    applicableBase = subtotal || lines.reduce((sum, l) => sum + (l.line_total || (l.quantity * l.unit_price)), 0);
    totalQuantity = lines.reduce((sum, l) => sum + Number(l.quantity), 0);
  }

  // 4. Check Minimum Purchase Amount
  if (discount.min_purchase_amount > 0 && applicableBase < discount.min_purchase_amount) {
    return {
      applies: false,
      discountAmount: 0,
      reason: `Minimum purchase of $${discount.min_purchase_amount.toFixed(2)} required (current: $${applicableBase.toFixed(2)})`
    };
  }

  // 5. Check Minimum Quantity (e.g. "discount for taking more seats")
  if (discount.min_quantity > 0 && totalQuantity < discount.min_quantity) {
    return {
      applies: false,
      discountAmount: 0,
      reason: `Minimum quantity of ${discount.min_quantity} items/seats required (current: ${totalQuantity})`
    };
  }

  // 6. Compute Discount Amount
  let discountAmount = 0;
  if (discount.discount_type === 'percentage') {
    discountAmount = (applicableBase * discount.discount_value) / 100;
  } else {
    // Fixed amount
    discountAmount = Math.min(discount.discount_value, applicableBase);
  }

  discountAmount = Number(discountAmount.toFixed(2));

  return {
    applies: true,
    discountId: discount.id,
    name: discount.name,
    code: discount.code,
    discountType: discount.discount_type,
    discountValue: discount.discount_value,
    discountAmount,
    applicableBase
  };
}

/**
 * Increment the redemption count of a discount rule.
 */
function recordDiscountUsage(discountId) {
  if (!discountId) return;
  const db = getDatabase();
  db.prepare(`
    UPDATE discount_rules
    SET times_used = times_used + 1,
        is_active = CASE WHEN max_uses > 0 AND (times_used + 1) >= max_uses THEN 0 ELSE is_active END
    WHERE id = ?
  `).run(discountId);
}

module.exports = {
  evaluateDiscount,
  recordDiscountUsage
};
