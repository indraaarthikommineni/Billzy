const { getDatabase } = require('../config/database');

function getTaxRule(taxId) {
  if (!taxId) return null;
  const db = getDatabase();
  return db.prepare('SELECT * FROM tax_rules WHERE id = ? AND is_active = 1').get(taxId);
}

function calculateTax(taxId, taxableAmount) {
  if (!taxId || taxableAmount <= 0) {
    return { taxId: null, rate: 0, amount: 0, code: '' };
  }

  const rule = getTaxRule(taxId);
  if (!rule) {
    return { taxId: null, rate: 0, amount: 0, code: '' };
  }

  const taxAmount = Number(((taxableAmount * rule.rate) / 100).toFixed(2));
  return {
    taxId: rule.id,
    name: rule.name,
    code: rule.code,
    rate: rule.rate,
    amount: taxAmount
  };
}

module.exports = {
  getTaxRule,
  calculateTax
};
