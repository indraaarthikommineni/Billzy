const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');

async function seedData(db) {
  const database = db || getDatabase();

  console.log('--- Starting Seed Data for Brightloop Software ---');

  // Check if already seeded
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already contains records. Skipping seed.');
    return;
  }

  // 1. Users
  const passAdmin = await bcrypt.hash('Admin123!@#', 10);
  const passStaff = await bcrypt.hash('Staff123!@#', 10);
  const passCust = await bcrypt.hash('Customer123!@#', 10);

  const insertUser = database.prepare(`
    INSERT INTO users (email, password_hash, name, company_name, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  const adminId = insertUser.run('admin@brightloop.com', passAdmin, 'Brightloop Admin', 'Brightloop Software', 'admin').lastInsertRowid;
  const staff1Id = insertUser.run('sarah.sales@brightloop.com', passStaff, 'Sarah Jenkins', 'Brightloop Software', 'staff').lastInsertRowid;
  const staff2Id = insertUser.run('mike.ops@brightloop.com', passStaff, 'Mike Vance', 'Brightloop Software', 'staff').lastInsertRowid;

  const cust1Id = insertUser.run('alex@novashops.com', passCust, 'Alex Rivera', 'Nova Retail Group', 'customer').lastInsertRowid;
  const cust2Id = insertUser.run('elena@apexlogistics.com', passCust, 'Elena Rostova', 'Apex Global Logistics', 'customer').lastInsertRowid;
  const cust3Id = insertUser.run('marcus@cloudcraft.io', passCust, 'Marcus Sterling', 'Cloudcraft Systems', 'customer').lastInsertRowid;
  const cust4Id = insertUser.run('chloe@zenithmedia.com', passCust, 'Chloe Dupont', 'Zenith Digital Media', 'customer').lastInsertRowid;

  console.log('✓ Users created');

  // 2. Tax Rules
  const insertTax = database.prepare(`
    INSERT INTO tax_rules (name, rate, code) VALUES (?, ?, ?)
  `);
  const taxVat10Id = insertTax.run('Standard VAT (10%)', 10.0, 'VAT10').lastInsertRowid;
  const taxSt8Id = insertTax.run('Sales Tax (8.25%)', 8.25, 'ST825').lastInsertRowid;
  const taxZeroId = insertTax.run('Tax Exempt (0%)', 0.0, 'EXEMPT').lastInsertRowid;

  console.log('✓ Tax rules created');

  // 3. Products & Variants
  const insertProd = database.prepare(`
    INSERT INTO products (name, type, sales_price, cost_price, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const prodErpId = insertProd.run('Brightloop ERP Cloud', 'software', 299.00, 45.00, 'Core subscription management & ERP backbone').lastInsertRowid;
  const prodSeatId = insertProd.run('Team Seat License', 'software', 35.00, 4.00, 'Per-user recurring seat license').lastInsertRowid;
  const prodSlaId = insertProd.run('Priority 24/7 SLA Support', 'service', 199.00, 25.00, 'Guaranteed 1-hour response SLA').lastInsertRowid;
  const prodAddonId = insertProd.run('Custom Webhooks & API Add-on', 'add_on', 79.00, 10.00, 'Real-time billing & notification webhooks').lastInsertRowid;

  // Variants (specifically testing the prompt requirement: "Odoo brand adds 560 to the price")
  const insertVariant = database.prepare(`
    INSERT INTO product_variants (product_id, variant_name, price_modifier, sku)
    VALUES (?, ?, ?, ?)
  `);

  const varStandardId = insertVariant.run(prodErpId, 'Standard Edition', 0.0, 'ERP-STD').lastInsertRowid;
  const varOdooId = insertVariant.run(prodErpId, 'Odoo Brand Edition', 560.00, 'ERP-ODOO-560').lastInsertRowid;
  insertVariant.run(prodSeatId, 'Standard User', 0.0, 'SEAT-STD');
  insertVariant.run(prodSeatId, 'Executive Power User', 25.00, 'SEAT-EXEC');

  console.log('✓ Products and variants created');

  // 4. Plans
  const insertPlan = database.prepare(`
    INSERT INTO plans (
      name, price, billing_frequency, min_quantity, valid_from, valid_to,
      auto_close_at_end, allow_early_close, allow_pause, allow_renewal
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const planMonthlyId = insertPlan.run(
    'Monthly Growth Plan', 299.00, 'monthly', 1, '2026-01-01', '2026-12-31',
    0, 1, 1, 1
  ).lastInsertRowid;

  const planYearlyId = insertPlan.run(
    'Yearly Enterprise Contract', 2990.00, 'yearly', 5, '2026-01-01', '2026-12-31',
    0, 0, 0, 1
  ).lastInsertRowid;

  const planWeeklyId = insertPlan.run(
    'Weekly Sprint Pilot', 99.00, 'weekly', 1, '2026-01-01', '2026-12-31',
    1, 1, 0, 0 // Auto close at end!
  ).lastInsertRowid;

  console.log('✓ Plans created');

  // 5. Discount Rules
  const insertDiscount = database.prepare(`
    INSERT INTO discount_rules (
      name, code, discount_type, discount_value, min_purchase_amount,
      min_quantity, start_date, end_date, max_uses, times_used, scope, applicable_product_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const discSeatsId = insertDiscount.run(
    '10+ Seats Volume Discount (15%)', 'SEATS15', 'percentage', 15.0, 0,
    10, '2026-01-01', '2026-12-31', 100, 3, 'all', null
  ).lastInsertRowid;

  const discFixedId = insertDiscount.run(
    'New Customer Welcome $50 Off', 'WELCOME50', 'fixed', 50.0, 200.0,
    1, '2026-01-01', '2026-12-31', 50, 1, 'all', null
  ).lastInsertRowid;

  console.log('✓ Discount rules created');

  // 6. Quotation Template
  const insertTemplate = database.prepare(`
    INSERT INTO quotation_templates (name, plan_id, validity_days, notes)
    VALUES (?, ?, ?, ?)
  `);

  const templateId = insertTemplate.run(
    'Enterprise Odoo Edition Bundle',
    planYearlyId,
    30,
    'Standard enterprise bundle pre-packaged with Odoo Brand edition, 10 user seats and 24/7 SLA'
  ).lastInsertRowid;

  const insertTemplateLine = database.prepare(`
    INSERT INTO quotation_template_lines (template_id, product_id, variant_id, quantity, tax_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertTemplateLine.run(templateId, prodErpId, varOdooId, 1, taxVat10Id);
  insertTemplateLine.run(templateId, prodSeatId, null, 10, taxVat10Id);
  insertTemplateLine.run(templateId, prodSlaId, null, 1, taxVat10Id);

  console.log('✓ Quotation templates created');

  // 7. Subscriptions & Invoices & Payments
  // Subscription 1: Nova Retail (Active Monthly Plan with Odoo variant)
  const insertSub = database.prepare(`
    INSERT INTO subscriptions (
      sub_number, customer_id, plan_id, status, start_date, expiry_date,
      payment_terms, last_billed_date, next_billing_date,
      subtotal, tax_amount, discount_amount, total_amount, discount_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // subtotal: (299 + 560) [Odoo ERP] + (5 * 35) [Seats] = 859 + 175 = 1034.00
  // tax 10%: 103.40
  // total: 1137.40
  const sub1Id = insertSub.run(
    'SUB-2026-0001', cust1Id, planMonthlyId, 'Active', '2026-01-01', '2026-12-31',
    'Net 15', '2026-01-01', '2026-02-01',
    1034.00, 103.40, 0, 1137.40, null, 'Nova Retail monthly primary subscription'
  ).lastInsertRowid;

  const insertSubLine = database.prepare(`
    INSERT INTO subscription_lines (
      subscription_id, product_id, variant_id, quantity, unit_price,
      tax_id, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSubLine.run(sub1Id, prodErpId, varOdooId, 1, 859.00, taxVat10Id, 10.0, 85.90, 944.90);
  insertSubLine.run(sub1Id, prodSeatId, null, 5, 35.00, taxVat10Id, 10.0, 17.50, 192.50);

  // Invoice 1 for Sub 1 (Paid)
  const insertInv = database.prepare(`
    INSERT INTO invoices (
      invoice_number, subscription_id, customer_id, billing_period_start,
      billing_period_end, issue_date, due_date, status, subtotal,
      tax_amount, discount_amount, total_amount, paid_amount, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inv1Id = insertInv.run(
    'INV-2026-0001', sub1Id, cust1Id, '2026-01-01',
    '2026-01-31', '2026-01-01', '2026-01-16', 'Paid',
    1034.00, 103.40, 0, 1137.40, 1137.40, 'January 2026 Monthly Billing'
  ).lastInsertRowid;

  const insertInvLine = database.prepare(`
    INSERT INTO invoice_lines (
      invoice_id, product_id, variant_id, description, quantity,
      unit_price, tax_rate, tax_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertInvLine.run(inv1Id, prodErpId, varOdooId, 'Brightloop ERP Cloud (Odoo Brand Edition)', 1, 859.00, 10.0, 85.90, 944.90);
  insertInvLine.run(inv1Id, prodSeatId, null, 'Team Seat License', 5, 35.00, 10.0, 17.50, 192.50);

  // Payment 1 for Invoice 1
  database.prepare(`
    INSERT INTO payments (
      payment_number, invoice_id, customer_id, payment_method,
      amount, payment_date, reference_no, note, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('PAY-2026-0001', inv1Id, cust1Id, 'bank_transfer', 1137.40, '2026-01-05', 'TXN-NOVA-8921', 'Settled via ACH Transfer', staff1Id);

  // Subscription 2: Apex Global Logistics (Active with Overdue Invoice to test aging)
  const sub2Id = insertSub.run(
    'SUB-2026-0002', cust2Id, planMonthlyId, 'Active', '2026-01-01', '2026-12-31',
    'Net 15', '2026-01-01', '2026-02-01',
    498.00, 49.80, 0, 547.80, null, 'Apex Logistics operations account'
  ).lastInsertRowid;

  insertSubLine.run(sub2Id, prodErpId, varStandardId, 1, 299.00, taxVat10Id, 10.0, 29.90, 328.90);
  insertSubLine.run(sub2Id, prodSlaId, null, 1, 199.00, taxVat10Id, 10.0, 19.90, 218.90);

  // Invoice 2 for Sub 2 (Confirmed, Partially Paid, Overdue)
  const inv2Id = insertInv.run(
    'INV-2026-0002', sub2Id, cust2Id, '2026-01-01',
    '2026-01-31', '2026-01-01', '2026-01-16', 'Confirmed',
    498.00, 49.80, 0, 547.80, 200.00, 'January 2026 Billing (Past Due)'
  ).lastInsertRowid;

  insertInvLine.run(inv2Id, prodErpId, varStandardId, 'Brightloop ERP Cloud (Standard Edition)', 1, 299.00, 10.0, 29.90, 328.90);
  insertInvLine.run(inv2Id, prodSlaId, null, 'Priority 24/7 SLA Support', 1, 199.00, 10.0, 19.90, 218.90);

  database.prepare(`
    INSERT INTO payments (
      payment_number, invoice_id, customer_id, payment_method,
      amount, payment_date, reference_no, note, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('PAY-2026-0002', inv2Id, cust2Id, 'credit_card', 200.00, '2026-01-10', 'CARD-APEX-4411', 'Partial deposit', staff1Id);

  // Subscription 3: Cloudcraft Systems (Large volume customer with Seats discount)
  // 15 seats @ $35 = $525. ERP Cloud = $299. Subtotal = $824.
  // 15% discount on $824 = $123.60.
  const sub3Id = insertSub.run(
    'SUB-2026-0003', cust3Id, planMonthlyId, 'Active', '2026-01-01', '2026-12-31',
    'Net 30', '2026-01-01', '2026-02-01',
    824.00, 82.40, 123.60, 782.80, discSeatsId, 'Cloudcraft 15-seat contract with volume discount'
  ).lastInsertRowid;

  insertSubLine.run(sub3Id, prodErpId, varStandardId, 1, 299.00, taxVat10Id, 10.0, 29.90, 328.90);
  insertSubLine.run(sub3Id, prodSeatId, null, 15, 35.00, taxVat10Id, 10.0, 52.50, 577.50);

  // Subscription 4: Zenith Media in Quotation stage
  const sub4Id = insertSub.run(
    'SUB-2026-0004', cust4Id, planYearlyId, 'Quotation', '2026-02-01', '2027-01-31',
    'Net 30', null, '2026-02-01',
    3488.00, 348.80, 0, 3836.80, null, 'Pending quote approval'
  ).lastInsertRowid;

  insertSubLine.run(sub4Id, prodErpId, varOdooId, 1, 859.00, taxVat10Id, 10.0, 85.90, 944.90);
  insertSubLine.run(sub4Id, prodSeatId, null, 20, 35.00, taxVat10Id, 10.0, 70.00, 770.00);

  console.log('✓ Subscriptions, Invoices, and Payments seeded successfully');
  console.log('--- Brightloop Seed Data Complete ---');
}

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedData };
