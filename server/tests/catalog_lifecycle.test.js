const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { closeDatabase, getDatabase } = require('../config/database');
const bcrypt = require('bcryptjs');

test('Product Variants, Plans & Subscription Lifecycle Suite', async (t) => {
  const app = createApp(':memory:');
  const db = getDatabase();

  let adminToken = '';
  let customerId = null;

  // Setup admin and customer
  await t.test('Setup Users', async () => {
    const hash = await bcrypt.hash('AdminSecret123!', 10);
    const adminRes = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('admin@brightloop.com', ?, 'Brightloop Admin', 'admin')
    `).run(hash);

    const custHash = await bcrypt.hash('CustSecret123!', 10);
    const custRes = db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('client@apex.com', ?, 'Apex Customer', 'customer')
    `).run(custHash);
    customerId = custRes.lastInsertRowid;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@brightloop.com', password: 'AdminSecret123!' });
    adminToken = loginRes.body.token;

    // Create a tax rule
    db.prepare("INSERT INTO tax_rules (name, rate, code) VALUES ('VAT 10%', 10.0, 'VAT10')").run();
  });

  let productId = null;
  let odooVariantId = null;

  await t.test('Product & Variant: Odoo brand adds 560 to the price', async () => {
    // 1. Create product (name, type, sales_price, cost_price, notes)
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Brightloop Business Suite',
        type: 'software',
        sales_price: 299.00,
        cost_price: 50.00,
        notes: 'Core ERP software'
      });

    assert.equal(prodRes.status, 201);
    productId = prodRes.body.product.id;
    assert.equal(prodRes.body.product.sales_price, 299);

    // 2. Add Odoo brand variant where choosing it adds 560 to the price
    const varRes = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        variant_name: 'Odoo Brand',
        price_modifier: 560.00
      });

    assert.equal(varRes.status, 201);
    odooVariantId = varRes.body.variant.id;
    assert.equal(varRes.body.variant.price_modifier, 560);
  });

  let flexiblePlanId = null;
  let lockedPlanId = null;

  await t.test('Plans: creation with lifecycle policy rules', async () => {
    // Plan 1: Flexible monthly plan (can be paused, closed early, renewed)
    const p1Res = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Flexible Monthly Plan',
        price: 299.00,
        billing_frequency: 'monthly',
        min_quantity: 1,
        valid_from: '2026-01-01',
        valid_to: '2026-12-31',
        allow_pause: 1,
        allow_early_close: 1,
        allow_renewal: 1
      });
    assert.equal(p1Res.status, 201);
    flexiblePlanId = p1Res.body.plan.id;

    // Plan 2: Locked yearly contract (cannot pause, cannot close early)
    const p2Res = await request(app)
      .post('/api/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Strict Yearly Enterprise Contract',
        price: 2990.00,
        billing_frequency: 'yearly',
        min_quantity: 1,
        valid_from: '2026-01-01',
        valid_to: '2026-12-31',
        allow_pause: 0,
        allow_early_close: 0,
        allow_renewal: 1
      });
    assert.equal(p2Res.status, 201);
    lockedPlanId = p2Res.body.plan.id;
  });

  let templateId = null;

  await t.test('Quotation Template: pre-configured offer with validity days', async () => {
    const tmplRes = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Standard Offer Template',
        plan_id: flexiblePlanId,
        validity_days: 15,
        lines: [
          { product_id: productId, variant_id: odooVariantId, quantity: 1, tax_id: 1 }
        ]
      });

    assert.equal(tmplRes.status, 201);
    templateId = tmplRes.body.template.id;
  });

  let subscriptionId = null;

  await t.test('Turn Quote into Subscription with Odoo variant calculation', async () => {
    // Sales rep prepares an offer from template
    const subRes = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_id: customerId,
        template_id: templateId,
        payment_terms: 'Net 30'
      });

    assert.equal(subRes.status, 201);
    const sub = subRes.body.subscription;
    subscriptionId = sub.id;

    assert.ok(sub.sub_number.startsWith('SUB-'));
    assert.equal(sub.status, 'Quotation');
    assert.ok(sub.quotation_valid_until);

    // Verify price: Base price 299 + Variant modifier 560 = 859.00
    // Tax 10% on 859 = 85.90
    // Total = 944.90
    assert.equal(sub.subtotal, 859.00);
    assert.equal(sub.tax_amount, 85.90);
    assert.equal(sub.total_amount, 944.90);
  });

  await t.test('Subscription Lifecycle Transitions: Quotation -> Confirmed -> Active', async () => {
    // 1. Move from Quotation to Confirmed
    const confRes = await request(app)
      .post(`/api/subscriptions/${subscriptionId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Confirmed' });

    assert.equal(confRes.status, 200);
    assert.equal(confRes.body.subscription.status, 'Confirmed');

    // 2. Move from Confirmed to Active
    const actRes = await request(app)
      .post(`/api/subscriptions/${subscriptionId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Active' });

    assert.equal(actRes.status, 200);
    assert.equal(actRes.body.subscription.status, 'Active');

    // 3. Pause Active subscription (allowed because plan permits pause)
    const pauseRes = await request(app)
      .post(`/api/subscriptions/${subscriptionId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Paused' });

    assert.equal(pauseRes.status, 200);
    assert.equal(pauseRes.body.subscription.status, 'Paused');

    // 4. Resume to Active
    const resumeRes = await request(app)
      .post(`/api/subscriptions/${subscriptionId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Active' });

    assert.equal(resumeRes.status, 200);
    assert.equal(resumeRes.body.subscription.status, 'Active');
  });

  await t.test('Plan policy enforcement: Locked plan blocks pause and early close', async () => {
    // Create subscription on locked plan
    const subRes = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_id: customerId,
        plan_id: lockedPlanId,
        lines: [{ product_id: productId, quantity: 1 }]
      });

    const lockedSubId = subRes.body.subscription.id;

    // Advance to Confirmed -> Active
    await request(app)
      .post(`/api/subscriptions/${lockedSubId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Confirmed' });

    await request(app)
      .post(`/api/subscriptions/${lockedSubId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Active' });

    // Attempt to pause -> rejected because plan.allow_pause = 0
    const pauseAttempt = await request(app)
      .post(`/api/subscriptions/${lockedSubId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Paused' });

    assert.equal(pauseAttempt.status, 400);
    assert.match(pauseAttempt.body.error, /does not permit pausing/i);

    // Attempt early close before expiry -> rejected because plan.allow_early_close = 0
    const closeAttempt = await request(app)
      .post(`/api/subscriptions/${lockedSubId}/transition`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Closed' });

    assert.equal(closeAttempt.status, 400);
    assert.match(closeAttempt.body.error, /does not allow closing/i);
  });

  closeDatabase();
});
