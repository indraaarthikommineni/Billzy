const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { closeDatabase } = require('../config/database');
const { validatePassword } = require('../middleware/validation');

test('Authentication, RBAC & Password Policy Suite', async (t) => {
  // Use in-memory database for isolated test execution
  const app = createApp(':memory:');

  await t.test('Password Policy: strict validation rules', () => {
    // Length <= 8 characters
    assert.equal(validatePassword('Ab1!').valid, false);
    assert.equal(validatePassword('Abcdef1!').valid, false); // 8 chars (needs > 8 chars)

    // Missing uppercase
    assert.equal(validatePassword('lowercase123!').valid, false);

    // Missing lowercase
    assert.equal(validatePassword('UPPERCASE123!').valid, false);

    // Missing special character
    assert.equal(validatePassword('Password1234').valid, false);

    // Valid compliant passwords (> 8 chars, uppercase, lowercase, special char)
    assert.equal(validatePassword('SecurePass123!').valid, true);
    assert.equal(validatePassword('Odoo2026@Brightloop').valid, true);
  });

  let customerToken = '';
  let adminToken = '';
  let staffToken = '';

  await t.test('Customer Registration: creates account with email & password', async () => {
    // Rejected when password doesn't meet policy
    const weakRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'testcustomer@novaretail.com',
        password: 'weak',
        name: 'Test Customer'
      });
    assert.equal(weakRes.status, 400);

    // Accepted with compliant password
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'testcustomer@novaretail.com',
        password: 'StrongPassword123!',
        name: 'Nova Retailer',
        company_name: 'Nova Retail Group'
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, 'customer');
    customerToken = res.body.token;

    // Duplicate email rejected
    const dupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'testcustomer@novaretail.com',
        password: 'StrongPassword123!',
        name: 'Nova Duplicate'
      });
    assert.equal(dupRes.status, 409);
  });

  await t.test('Create Admin & Staff User', async () => {
    const bcrypt = require('bcryptjs');
    const { getDatabase } = require('../config/database');
    const db = getDatabase();

    const passHash = await bcrypt.hash('AdminPass123!', 10);
    db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('admin@brightloop.com', ?, 'Brightloop Admin', 'admin')
    `).run(passHash);

    // Admin login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@brightloop.com',
        password: 'AdminPass123!'
      });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.role, 'admin');
    adminToken = loginRes.body.token;
  });

  await t.test('RBAC: Only Admin can add a new member of staff', async () => {
    // 1. Customer attempts to add staff -> Forbidden (403)
    const custAttempt = await request(app)
      .post('/api/staff')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        email: 'sarah.sales@brightloop.com',
        password: 'StaffSecret123!',
        name: 'Sarah Sales'
      });
    assert.equal(custAttempt.status, 403);

    // 2. Admin adds staff -> Success (201)
    const adminAttempt = await request(app)
      .post('/api/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'sarah.sales@brightloop.com',
        password: 'StaffSecret123!',
        name: 'Sarah Sales',
        role: 'staff'
      });

    assert.equal(adminAttempt.status, 201);
    assert.equal(adminAttempt.body.staff.role, 'staff');

    // 3. Newly created staff logs in
    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sarah.sales@brightloop.com',
        password: 'StaffSecret123!'
      });
    assert.equal(staffLogin.status, 200);
    staffToken = staffLogin.body.token;

    // 4. Staff attempts to add another staff member -> Forbidden (403)
    const staffAttempt = await request(app)
      .post('/api/staff')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        email: 'another.staff@brightloop.com',
        password: 'StaffSecret123!',
        name: 'Another Staff'
      });
    assert.equal(staffAttempt.status, 403);
  });

  await t.test('Password Reset: token dispatch and reset execution', async () => {
    // Request reset
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'testcustomer@novaretail.com' });

    assert.equal(forgotRes.status, 200);
    assert.ok(forgotRes.body.resetToken);

    const token = forgotRes.body.resetToken;

    // Reset password with new compliant password
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token,
        new_password: 'NewSuperPassword123!'
      });

    assert.equal(resetRes.status, 200);

    // Login with new password succeeds
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testcustomer@novaretail.com',
        password: 'NewSuperPassword123!'
      });
    assert.equal(newLogin.status, 200);
  });

  closeDatabase();
});
