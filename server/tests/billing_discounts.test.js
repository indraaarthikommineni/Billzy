const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { closeDatabase, getDatabase } = require('../config/database');
const bcrypt = require('bcryptjs');

test('Billing Engine, Discounts & Payments Suite', async (t) => {
  const app = createApp(':memory:');
  const db = getDatabase();

  let adminToken = '';
  let customerToken = '';
  let customerId = null;
  let productId = null;
  let planId = null;

  await t.test('Setup Suite Data', async () => {
    // Admin
    const aHash = await bcrypt.hash('AdminSecret123!', 10);
    db.prepare("INSERT INTO users (email, password_hash, name, role) VALUES ('admin@brightloop.com', ?, 'Admin', 'admin')").run(aHash);

    // Customer
    const cHash = await bcrypt.hash('CustomerPass123!', 10);
    const cRes = db.prepare("INSERT INTO users (email, password_hash, name, role) VALUES ('cust@brightloop.com', ?, 'Customer One', 'customer')").run(cHash);
    customerId = cRes.lastInsertRowid;

    // Tokens
    const aLog = await request(app).post('/api/auth/login').send({ email: 'admin@brightloop.com', password: 'AdminSecret123!' });
    adminToken = aLog.body.token;

    const cLog = await request(app).post('/api/auth/login').send({ email: 'cust@brightloop.com', password: 'CustomerPass123!' });
    customerToken = cLog.body.token;

    // Tax Rule: 10% VAT
    db.prepare("INSERT INTO tax_rules (name, rate, code) VALUES ('VAT 10%', 10.0, 'VAT10')").run();

    // Product: Seat License ($50)
    const pRes = db.prepare("INSERT INTO products (name, type, sales_price) VALUES ('Seat License', 'software', 50.0)").run();
    productId = pRes.lastInsertRowid;

    // Plan: Monthly
    const plRes = db.prepare(`
      INSERT INTO plans (name, price, billing_frequency, min_quantity, valid_from)
      VALUES ('Monthly Team', 50.0, 'monthly', 1, '2026-01-01')
    `).run();
    planId = plRes.lastInsertRowid;
  });

  let discountId = null;

  await t.test('Discount Rules: Admin only, min quantity condition & usage limit', async () => {
    // 1. Customer attempts to create discount -> 403 Forbidden
    const custDisc = await request(app)
      .post('/api/discounts')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Hacked 50% Off',
        code: 'HACK50',
        discount_type: 'percentage',
        discount_value: 50,
        start_date: '2026-01-01',
        end_date: '2026-12-31'
      });
    assert.equal(custDisc.status, 403);

    // 2. Admin creates discount for customer taking 10 or more seats: 20% off, max 2 uses
    const adminDisc = await request(app)
      .post('/api/discounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '10+ Seats 20% Discount',
        code: 'SEATS20',
        discount_type: 'percentage',
        discount_value: 20.0,
        min_quantity: 10,
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        max_uses: 2,
        scope: 'all'
      });

    assert.equal(adminDisc.status, 201);
    discountId = adminDisc.body.discount.id;

    // 3. Evaluate: fails when only 5 seats
    const eval5 = await request(app)
      .post('/api/discounts/evaluate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        discount_id: discountId,
        lines: [{ product_id: productId, quantity: 5, unit_price: 50.0, line_total: 250.0 }],
        subtotal: 250.0
      });
    assert.equal(eval5.body.result.applies, false);

    // 4. Evaluate: succeeds when 10 seats (20% of $500 = $100 discount)
    const eval10 = await request(app)
      .post('/api/discounts/evaluate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        discount_id: discountId,
        lines: [{ product_id: productId, quantity: 10, unit_price: 50.0, line_total: 500.0 }],
        subtotal: 500.0
      });
    assert.equal(eval10.body.result.applies, true);
    assert.equal(eval10.body.result.discountAmount, 100.0);
  });

  let subscriptionId = null;

  await t.test('Subscription with discount applied on next invoice', async () => {
    // Customer takes 10 seats with the discount code applied
    const subRes = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_id: customerId,
        plan_id: planId,
        discount_id: discountId,
        payment_terms: 'Net 15',
        start_date: '2026-02-01',
        lines: [
          { product_id: productId, quantity: 10, unit_price: 50.0, tax_id: 1 }
        ]
      });

    assert.equal(subRes.status, 201);
    subscriptionId = subRes.body.subscription.id;

    // Confirm and activate subscription
    await request(app).post(`/api/subscriptions/${subscriptionId}/transition`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Confirmed' });
    await request(app).post(`/api/subscriptions/${subscriptionId}/transition`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Active' });

    // Base: 10 * $50 = $500. Tax: 10% = $50. Discount: 20% = $100. Total = $450.
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscriptionId);
    assert.equal(sub.subtotal, 500);
    assert.equal(sub.tax_amount, 50);
    assert.equal(sub.discount_amount, 100);
    assert.equal(sub.total_amount, 450);
  });

  let generatedInvoiceId = null;

  await t.test('Billing Day: Automated billing engine & Idempotent duplicate check', async () => {
    // Run billing as of 2026-02-01
    const runRes = await request(app)
      .post('/api/billing/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ as_of_date: '2026-02-01' });

    assert.equal(runRes.status, 200);
    assert.equal(runRes.body.results.createdCount, 1);
    assert.equal(runRes.body.results.skippedCount, 0);

    const invoice = runRes.body.results.invoices[0];
    generatedInvoiceId = invoice.id;

    assert.ok(invoice.invoice_number.startsWith('INV-'));
    assert.equal(invoice.status, 'Draft');
    assert.equal(invoice.subtotal, 500);
    assert.equal(invoice.tax_amount, 50);
    assert.equal(invoice.discount_amount, 100);
    assert.equal(invoice.total_amount, 450);

    // Verify "Nothing should be billed twice or skipped"
    // Trigger billing AGAIN for the exact same date -> must skip duplicate
    const secondRun = await request(app)
      .post('/api/billing/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ as_of_date: '2026-02-01' });

    assert.equal(secondRun.status, 200);
    assert.equal(secondRun.body.results.createdCount, 0); // No double billing!
  });

  await t.test('Invoice Actions: Confirm, Send & Payments', async () => {
    // 1. Confirm invoice (Draft -> Confirmed)
    const confRes = await request(app)
      .post(`/api/invoices/${generatedInvoiceId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(confRes.status, 200);
    assert.equal(confRes.body.invoice.status, 'Confirmed');

    // 2. Send invoice
    const sendRes = await request(app)
      .post(`/api/invoices/${generatedInvoiceId}/send`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(sendRes.status, 200);
    assert.ok(sendRes.body.sentAt);

    // 3. Partial Payment of $200
    const partialPay = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoice_id: generatedInvoiceId,
        amount: 200.0,
        payment_method: 'bank_transfer',
        payment_date: '2026-02-05',
        note: 'Partial deposit wire transfer'
      });

    assert.equal(partialPay.status, 201);
    assert.equal(partialPay.body.invoice.paid_amount, 200.0);
    assert.equal(partialPay.body.invoice.status, 'Confirmed'); // Still confirmed, not yet fully paid
    assert.equal(partialPay.body.remainingBalance, 250.0);

    // 4. Overpayment rejection (attempting to pay $300 when only $250 is remaining)
    const overPay = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoice_id: generatedInvoiceId,
        amount: 300.0,
        payment_method: 'credit_card'
      });

    assert.equal(overPay.status, 400);
    assert.match(overPay.body.error, /exceeds remaining balance/i);

    // 5. Final settlement of $250 -> Transitions status to Paid!
    const finalPay = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoice_id: generatedInvoiceId,
        amount: 250.0,
        payment_method: 'credit_card',
        payment_date: '2026-02-10',
        note: 'Final balance clearance'
      });

    assert.equal(finalPay.status, 201);
    assert.equal(finalPay.body.invoice.paid_amount, 450.0);
    assert.equal(finalPay.body.invoice.status, 'Paid');
    assert.equal(finalPay.body.remainingBalance, 0);
  });

  closeDatabase();
});
