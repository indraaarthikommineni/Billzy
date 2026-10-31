const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');
const { getDatabase, closeDatabase } = require('../config/database');
const { getFinanceDashboardSummary } = require('../services/reportingService');
const bcrypt = require('bcryptjs');

test('High-Volume Performance Benchmark Suite (< 2s SLA)', async (t) => {
  const app = createApp(':memory:');
  const db = getDatabase();

  const TOTAL_SUBSCRIPTIONS = 3000;
  const TOTAL_INVOICES = 5000;

  console.log(`\n======================================================`);
  console.log(`⚡ STRESS BENCHMARK: Generating ${TOTAL_SUBSCRIPTIONS} subscriptions & ${TOTAL_INVOICES} invoices...`);
  console.log(`======================================================`);

  const setupStart = Date.now();

  // Create admin, plan, product
  const pass = await bcrypt.hash('Admin123!@#', 10);
  const userStmt = db.prepare("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)");
  const adminId = userStmt.run('admin@brightloop.com', pass, 'Admin', 'admin').lastInsertRowid;

  // Insert 200 customers
  const customerIds = [];
  db.transaction(() => {
    for (let i = 1; i <= 200; i++) {
      const cId = userStmt.run(`customer${i}@company${i}.com`, pass, `Customer ${i}`, 'customer').lastInsertRowid;
      customerIds.push(cId);
    }
  })();

  const planStmt = db.prepare("INSERT INTO plans (name, price, billing_frequency, min_quantity, valid_from) VALUES (?, ?, ?, 1, '2026-01-01')");
  const p1 = planStmt.run('Monthly Growth', 199.00, 'monthly').lastInsertRowid;
  const p2 = planStmt.run('Annual Enterprise', 1990.00, 'yearly').lastInsertRowid;
  const p3 = planStmt.run('Weekly Pilot', 49.00, 'weekly').lastInsertRowid;
  const plans = [p1, p2, p3];

  // Bulk insert 3,000 subscriptions
  const subStmt = db.prepare(`
    INSERT INTO subscriptions (
      sub_number, customer_id, plan_id, status, start_date, expiry_date,
      payment_terms, next_billing_date, subtotal, tax_amount, total_amount
    ) VALUES (?, ?, ?, ?, '2026-01-01', '2026-12-31', 'Net 15', '2026-02-01', ?, ?, ?)
  `);

  const statuses = ['Active', 'Active', 'Active', 'Quotation', 'Confirmed', 'Paused', 'Closed'];

  db.transaction(() => {
    for (let i = 1; i <= TOTAL_SUBSCRIPTIONS; i++) {
      const custId = customerIds[i % customerIds.length];
      const planId = plans[i % plans.length];
      const status = statuses[i % statuses.length];
      const subtotal = 100 + (i % 500);
      const tax = Number((subtotal * 0.1).toFixed(2));
      const total = subtotal + tax;

      subStmt.run(`SUB-2026-${String(i).padStart(5, '0')}`, custId, planId, status, subtotal, tax, total);
    }
  })();

  // Bulk insert 5,000 invoices across varying billing periods
  const invStmt = db.prepare(`
    INSERT INTO invoices (
      invoice_number, subscription_id, customer_id, billing_period_start,
      billing_period_end, issue_date, due_date, status, subtotal,
      tax_amount, total_amount, paid_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const invStatuses = ['Paid', 'Confirmed', 'Draft'];
  const dueDates = ['2026-01-15', '2026-02-15', '2025-12-15', '2025-11-15']; // Some overdue!

  db.transaction(() => {
    for (let i = 1; i <= TOTAL_INVOICES; i++) {
      const subId = (i % TOTAL_SUBSCRIPTIONS) + 1;
      const custId = customerIds[i % customerIds.length];
      const status = invStatuses[i % invStatuses.length];
      const dueDate = dueDates[i % dueDates.length];
      const subtotal = 150 + (i % 300);
      const tax = Number((subtotal * 0.1).toFixed(2));
      const total = subtotal + tax;
      const paid = status === 'Paid' ? total : (status === 'Confirmed' ? Math.floor(total * 0.4) : 0);

      // Distinct billing cycle per repeat: cycle 1, cycle 2, etc.
      const cycleIndex = Math.floor(i / TOTAL_SUBSCRIPTIONS) + 1;
      const periodStart = `2026-0${cycleIndex}-01`;
      const periodEnd = `2026-0${cycleIndex}-28`;

      invStmt.run(
        `INV-2026-${String(i).padStart(5, '0')}`,
        subId,
        custId,
        periodStart,
        periodEnd,
        periodStart,
        dueDate,
        status,
        subtotal,
        tax,
        total,
        paid
      );
    }
  })();

  const setupTime = Date.now() - setupStart;
  console.log(`✓ Database seeded in ${setupTime} ms`);

  await t.test('Finance Lead Dashboard query responds in < 2.00 seconds SLA', () => {
    const iterations = 5;
    const latencies = [];

    let summary = null;

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      summary = getFinanceDashboardSummary();
      const end = process.hrtime.bigint();
      const latencyMs = Number(end - start) / 1e6;
      latencies.push(latencyMs);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / iterations;
    const maxLatency = Math.max(...latencies);

    console.log(`\n------------------------------------------------------`);
    console.log(`📊 PERFORMANCE SLA VERIFICATION RESULTS:`);
    console.log(`• Records Analyzed: ${TOTAL_SUBSCRIPTIONS} Subscriptions & ${TOTAL_INVOICES} Invoices`);
    console.log(`• Average Response Time: ${avgLatency.toFixed(2)} ms`);
    console.log(`• Maximum Response Time: ${maxLatency.toFixed(2)} ms`);
    console.log(`• Target Hackathon SLA : < 2000 ms (< 2.0 seconds)`);
    console.log(`• Speed Margin         : ${(2000 / avgLatency).toFixed(1)}x faster than required!`);
    console.log(`------------------------------------------------------`);
    console.log(`Active Subscriptions: ${summary.metrics.activeSubscriptions}`);
    console.log(`Calculated MRR      : $${summary.metrics.mrr.toLocaleString()}`);
    console.log(`Calculated ARR      : $${summary.metrics.arr.toLocaleString()}`);
    console.log(`Total Invoiced      : $${summary.metrics.totalInvoiced.toLocaleString()}`);
    console.log(`Total Collected     : $${summary.metrics.totalCollected.toLocaleString()}`);
    console.log(`Total Outstanding   : $${summary.metrics.totalOutstanding.toLocaleString()}`);
    console.log(`Overdue Invoices    : ${summary.metrics.overdueInvoicesCount} ($${summary.metrics.overdueAmount.toLocaleString()})`);
    console.log(`------------------------------------------------------\n`);

    // Verify SLA requirement: Every page should still respond in under two seconds
    assert.ok(maxLatency < 2000, `Expected latency to be < 2000 ms, got ${maxLatency} ms`);
    assert.ok(summary.metrics.activeSubscriptions > 1000);
  });

  closeDatabase();
});
