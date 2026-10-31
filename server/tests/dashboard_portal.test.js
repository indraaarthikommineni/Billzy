const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { closeDatabase } = require('../config/database');
const { seedData } = require('../db/seed');

test('Customer Portal & Finance Executive Dashboard Suite', async (t) => {
  const app = createApp(':memory:');
  await seedData();

  let adminToken = '';
  let customerToken = '';

  await t.test('Log in Admin and Customer', async () => {
    const aLog = await request(app).post('/api/auth/login').send({
      email: 'admin@brightloop.com',
      password: 'Admin123!@#'
    });
    assert.equal(aLog.status, 200);
    adminToken = aLog.body.token;

    const cLog = await request(app).post('/api/auth/login').send({
      email: 'alex@novashops.com',
      password: 'Customer123!@#'
    });
    assert.equal(cLog.status, 200);
    customerToken = cLog.body.token;
  });

  await t.test('Customer Portal: customer sees only their own data', async () => {
    // 1. Overview
    const overRes = await request(app)
      .get('/api/portal/overview')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(overRes.status, 200);
    assert.equal(overRes.body.customer.email, 'alex@novashops.com');
    assert.equal(overRes.body.activeSubscriptionsCount, 1);

    // 2. Subscriptions
    const subsRes = await request(app)
      .get('/api/portal/subscriptions')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(subsRes.status, 200);
    assert.equal(subsRes.body.subscriptions.length, 1);
    assert.equal(subsRes.body.subscriptions[0].sub_number, 'SUB-2026-0001');

    // 3. Invoices
    const invRes = await request(app)
      .get('/api/portal/invoices')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(invRes.status, 200);
    assert.equal(invRes.body.invoices.length, 1);
    assert.equal(invRes.body.invoices[0].invoice_number, 'INV-2026-0001');
  });

  await t.test('Customer Self-Service: Pause and Resume subscription without emailing', async () => {
    // Nova Retail pauses their subscription #1 (allowed by Monthly plan)
    const pauseRes = await request(app)
      .post('/api/portal/subscriptions/1/pause')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(pauseRes.status, 200);
    assert.equal(pauseRes.body.subscription.status, 'Paused');

    // Nova Retail resumes their subscription
    const resumeRes = await request(app)
      .post('/api/portal/subscriptions/1/resume')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(resumeRes.status, 200);
    assert.equal(resumeRes.body.subscription.status, 'Active');
  });

  await t.test('Finance Lead Dashboard: answers all end-of-month questions', async () => {
    const dashRes = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(dashRes.status, 200);
    const body = dashRes.body;

    // How many subscriptions are active?
    assert.ok(body.metrics.activeSubscriptions >= 2);

    // Monthly Recurring Revenue & Annual Recurring Revenue
    assert.ok(body.metrics.mrr > 0);
    assert.ok(body.metrics.arr > 0);

    // How much revenue came in, and how much is still owed?
    assert.ok(body.metrics.totalCollected > 0);
    assert.ok(body.metrics.totalOutstanding > 0);

    // Which invoices are overdue?
    assert.ok(body.metrics.overdueInvoicesCount > 0);
    assert.ok(body.metrics.overdueAmount > 0);
    assert.ok(Array.isArray(body.overdueInvoicesList));

    // Aging buckets
    assert.ok(body.agingBuckets);
    assert.ok(body.agingBuckets['1-30_days']);

    console.log('Finance Dashboard metrics:', body.metrics);
    console.log('Dashboard execution time:', body.executionTimeMs);
  });

  closeDatabase();
});
