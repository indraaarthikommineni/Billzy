# Billzy - Subscription Management & Recurring Billing Platform
### Built for Brightloop Software | Odoo Hackathon 2026

**Billzy** is a unified recurring billing, subscription lifecycle, and customer management platform built to serve as the digital backbone of a subscription business. Inspired by the modular elegance of **Odoo**, Billzy eliminates spreadsheets, manual invoicing errors, missed renewals, and slow quarterly reporting with a high-performance, real-time recurring revenue engine.

---

## ⚡ Key Highlights & Spec Compliance

- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full system control. Only the admin can add new staff members and create discount rules.
  - **Internal Staff**: Daily operations (quotes, subscriptions, billing, recording payments, customer management).
  - **Customer Portal**: Customers see only their own subscriptions, invoices, and payments, with self-service pause/cancel capabilities.
- **Strict Authentication & Security**:
  - Email uniqueness enforced.
  - Strict password policy: more than 8 characters, with uppercase, lowercase, and special character.
  - Tokenized password reset link workflow.
- **Product Variants & Price Modifiers**:
  - Full product catalog with variant price adjustments (e.g. choosing the **Odoo brand variant adds $560** to the price).
- **Flexible Subscription Plans & Lifecycle Governance**:
  - Billing frequencies: `daily`, `weekly`, `monthly`, `yearly`.
  - Configurable lifecycle rules plan-by-plan: `auto_close_at_end`, `allow_early_close`, `allow_pause`, `allow_renewal`.
- **Quotations to Subscriptions**:
  - Fast quotation templates with validity countdown (e.g., valid for 15 or 30 days).
  - Visual state machine: `Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed` (with `Paused` state).
  - Unique subscription sequence: `SUB-YYYY-XXXX`.
- **Automated Billing Day Engine**:
  - Pre-fills customer details, product lines, taxes, and applied discounts.
  - **Zero Duplicate Billing Guarantee**: Idempotent billing cycle keys (`subscription_id` + `billing_period_start`) ensure no subscription is billed twice or skipped.
  - Automatic invoice lifecycle: `Draft` ➔ `Confirmed` ➔ `Paid`.
  - Configurable tax rules engine (VAT, Sales Tax, Exempt).
- **Admin Discount Rules Engine**:
  - Fixed amount or percentage discounts.
  - Minimum purchase or quantity conditions (e.g. 10+ seats).
  - Validity date windows and maximum usage count limits.
  - Automatically applied on recurring invoices without human memory; stops on expiration.
- **Multi-Method Payment Ledger**:
  - Supports Credit Card, Bank Transfer, Stripe, PayPal, Cash, Check with reference notes.
  - Full and partial payment tracking; automatically transitions invoice to `Paid` on zero balance.
- **Executive Finance Dashboard & < 2s Performance SLA**:
  - Real-time answers to: Active subscriptions count, MRR, ARR, Total Collected Cash, Total Outstanding (Accounts Receivable), and Overdue Invoices.
  - Receivables Aging analysis buckets (1-30 days, 31-60 days, 61-90 days, 90+ days).
  - **Performance Benchmark**: Evaluates thousands of subscriptions in **~31 ms** (over **64x faster** than the 2-second hackathon SLA requirement).

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+ or v25+)
- **npm** (v9+)

### 2. Install & Seed
```bash
# Clone / navigate to project root
cd Billzy

# Install dependencies (Express, better-sqlite3, bcryptjs, jsonwebtoken, etc.)
npm install

# Seed demo data for Brightloop Software
npm run seed
```

### 3. Start the Application (Unified Backend & Frontend)
```bash
# Starts the server which serves both the REST API and the interactive React UI
npm start
# Open your browser at http://localhost:5000
```

For frontend development with Vite Hot Module Reloading (HMR):
```bash
# Terminal 1: Backend API
npm run dev

# Terminal 2: Vite React Frontend (proxies to http://localhost:5000)
npm run dev:client
# Open http://localhost:5173
```

### 4. Run Automated Tests & Performance Benchmark
```bash
# Run complete test suite (27 passing tests across all modules)
npm test

# Run high-volume stress benchmark (3,000 subscriptions & 5,000 invoices)
npm run test:benchmark
```

---

## 🔑 Demo Credentials (Pre-seeded)

| Role | Email | Password | Permissions & Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.com` | `Admin123!@#` | Full system control. Can add staff, create discount rules, configure taxes & plans. |
| **Staff** | `sarah.sales@brightloop.com` | `Staff123!@#` | Sales & operations. Can create quotes, manage subscriptions, run billing, record payments. |
| **Staff** | `mike.ops@brightloop.com` | `Staff123!@#` | Operations staff. |
| **Customer** | `alex@novashops.com` | `Customer123!@#` | Nova Retail Group. Has active subscription with Odoo brand variant. |
| **Customer** | `elena@apexlogistics.com` | `Customer123!@#` | Apex Global Logistics. Has active subscription and overdue invoice. |
| **Customer** | `marcus@cloudcraft.io` | `Customer123!@#` | Cloudcraft Systems. Has active 15-seat subscription with volume discount. |
| **Customer** | `chloe@zenithmedia.com` | `Customer123!@#` | Zenith Digital Media. Has quotation pending confirmation. |

---

## 📊 Performance SLA Verification Results

Tested on high-volume dataset via `npm run test:benchmark`:
- **Subscriptions Analyzed**: 3,000
- **Invoices Analyzed**: 5,000
- **Average Dashboard Response Time**: **31.17 ms**
- **Maximum Response Time**: **34.92 ms**
- **Hackathon SLA Requirement**: `< 2,000 ms (< 2.0 seconds)`
- **Speed Margin**: **64.2x faster than required**

---

## 📡 API Reference Overview

### 1. Authentication & Users
- `POST /api/auth/signup` - Register a customer account (validates password policy & email uniqueness).
- `POST /api/auth/login` - Authenticate user & return JWT token.
- `GET /api/auth/me` - Get profile for authenticated user.
- `POST /api/auth/forgot-password` - Request a password reset link token.
- `POST /api/auth/reset-password` - Reset password using verified token.
- `GET /api/staff` - List all staff (Admin only).
- `POST /api/staff` - Add a new staff member (Admin only).

### 2. Catalog & Quotation Templates
- `GET /api/products` - List products with variant pricing modifiers.
- `POST /api/products` - Create product (Admin/Staff).
- `POST /api/products/:id/variants` - Add variant (e.g. Odoo brand adds +$560).
- `GET /api/plans` - List plans with billing frequencies and lifecycle flags.
- `POST /api/plans` - Create plan (Admin only).
- `GET /api/templates` - List quotation templates with pre-configured products and validity days.
- `POST /api/templates` - Create reusable quotation template.

### 3. Subscriptions & State Transitions
- `GET /api/subscriptions` - List subscriptions with filters (`status`, `customer_id`, `plan_id`, `search`).
- `GET /api/subscriptions/:id` - Full subscription detail with line items, invoices, and timeline audit log.
- `POST /api/subscriptions` - Create new quotation/subscription (from scratch or template).
- `POST /api/subscriptions/:id/transition` - State machine transition (`Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed` / `Paused`).

### 4. Billing Engine & Invoices
- `GET /api/billing/due` - Preview active subscriptions due for billing on an as-of date.
- `POST /api/billing/run` - Execute batch automated billing (idempotent, skips duplicates).
- `POST /api/billing/subscription/:id` - Bill a single active subscription.
- `GET /api/invoices` - List invoices with status, balance, and overdue flags.
- `GET /api/invoices/:id` - Detailed invoice with lines, tax breakdown, and payments.
- `POST /api/invoices/:id/confirm` - Confirm invoice from `Draft` to `Confirmed`.
- `POST /api/invoices/:id/cancel` - Cancel invoice.
- `POST /api/invoices/:id/send` - Mark invoice as sent / dispatch notification.

### 5. Discounts & Taxes
- `GET /api/discounts` - List discount rules.
- `POST /api/discounts` - Create discount rule (Admin only: fixed/%, min qty/seats, date ranges, max uses).
- `POST /api/discounts/evaluate` - Test discount applicability against cart lines.
- `GET /api/taxes` - List tax rules.
- `POST /api/taxes` - Create tax rule (Admin only).

### 6. Payments
- `GET /api/payments` - List payments ledger.
- `POST /api/payments` - Record payment against invoice (method, amount, date, reference, note).
- `GET /api/payments/methods` - List supported payment methods.

### 7. Executive Finance Dashboard
- `GET /api/dashboard` - Real-time metrics: Active subscriptions count, MRR, ARR, Total Billed, Total Collected, Total Outstanding, Overdue Invoices, Aging Buckets, and recent payments.

### 8. Customer Self-Service Portal
- `GET /api/portal/overview` - Scoped dashboard for the logged-in customer.
- `GET /api/portal/subscriptions` - Customer's subscriptions.
- `GET /api/portal/invoices` - Customer's invoices with balances.
- `GET /api/portal/payments` - Customer's payment history.
- `POST /api/portal/subscriptions/:id/pause` - Customer pauses subscription (governed by plan policy).
- `POST /api/portal/subscriptions/:id/resume` - Customer resumes paused subscription.
- `POST /api/portal/subscriptions/:id/cancel` - Customer cancels subscription (governed by plan policy).

---

## 🛡️ Test Suite Summary

The automated test suite (`npm test`) covers every single user story and acceptance criteria:
1. `server/tests/auth.test.js`: Password complexity enforcement, unique email constraint, RBAC (only admin adds staff), password reset token lifecycle.
2. `server/tests/catalog_lifecycle.test.js`: Product creation, variant price modifiers (Odoo brand adds 560), plan policies (allow_pause, allow_early_close), quote templates, quote-to-subscription conversion, lifecycle transitions.
3. `server/tests/billing_discounts.test.js`: Admin-only discount creation, seat quantity threshold condition, discount expiration and usage limit counters, automated billing day engine, idempotency (no double-billing), invoice states, partial and full payments, auto-marking Paid.
4. `server/tests/dashboard_portal.test.js`: Customer portal isolation, self-service pause/resume without emailing, finance executive dashboard metrics (MRR, ARR, overdue aging).
5. `server/tests/benchmark.test.js`: 3,000 subscriptions, 5,000 invoices stress test validating < 2-second SLA.
