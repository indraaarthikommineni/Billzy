-- Billzy Database Schema (SQLite with WAL mode and indexes)

PRAGMA foreign_keys = ON;

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    role TEXT CHECK(role IN ('admin', 'staff', 'customer')) NOT NULL DEFAULT 'customer',
    reset_token TEXT,
    reset_token_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Tax Rules
CREATE TABLE IF NOT EXISTS tax_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rate REAL NOT NULL, -- e.g. 10.0 for 10%
    code TEXT NOT NULL, -- e.g. 'VAT10', 'GST18'
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Discount Rules (Admin created)
CREATE TABLE IF NOT EXISTS discount_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT CHECK(discount_type IN ('fixed', 'percentage')) NOT NULL,
    discount_value REAL NOT NULL, -- e.g. 50 ($50) or 15 (15%)
    min_purchase_amount REAL DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    max_uses INTEGER DEFAULT 0, -- 0 = unlimited
    times_used INTEGER DEFAULT 0,
    scope TEXT CHECK(scope IN ('all', 'product')) NOT NULL DEFAULT 'all',
    applicable_product_id INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicable_product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_discounts_dates ON discount_rules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discount_rules(is_active);

-- 4. Products & Variants
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('software', 'service', 'add_on', 'hardware')) NOT NULL DEFAULT 'software',
    sales_price REAL NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    variant_name TEXT NOT NULL, -- e.g. 'Odoo Brand', 'Enterprise Tier'
    price_modifier REAL NOT NULL DEFAULT 0, -- e.g. +560.00
    sku TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- 5. Plans
CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    billing_frequency TEXT CHECK(billing_frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
    min_quantity INTEGER NOT NULL DEFAULT 1,
    valid_from DATE NOT NULL,
    valid_to DATE,
    auto_close_at_end INTEGER NOT NULL DEFAULT 0, -- 1 = auto close on expiry
    allow_early_close INTEGER NOT NULL DEFAULT 1,
    allow_pause INTEGER NOT NULL DEFAULT 1,
    allow_renewal INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);

-- 6. Quotation Templates
CREATE TABLE IF NOT EXISTS quotation_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    plan_id INTEGER NOT NULL,
    validity_days INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS quotation_template_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    discount_id INTEGER,
    tax_id INTEGER,
    FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    FOREIGN KEY (discount_id) REFERENCES discount_rules(id) ON DELETE SET NULL,
    FOREIGN KEY (tax_id) REFERENCES tax_rules(id) ON DELETE SET NULL
);

-- 7. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub_number TEXT UNIQUE NOT NULL, -- e.g. SUB-2026-0001
    customer_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed')) NOT NULL DEFAULT 'Draft',
    start_date DATE NOT NULL,
    expiry_date DATE,
    quotation_valid_until DATE,
    payment_terms TEXT NOT NULL DEFAULT 'Net 15', -- 'Immediate', 'Net 15', 'Net 30', 'Net 60'
    last_billed_date DATE,
    next_billing_date DATE NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    discount_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
    FOREIGN KEY (discount_id) REFERENCES discount_rules(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_next_billing ON subscriptions(next_billing_date);

-- 8. Subscription Lines
CREATE TABLE IF NOT EXISTS subscription_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    tax_id INTEGER,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    line_total REAL NOT NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    FOREIGN KEY (tax_id) REFERENCES tax_rules(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_lines_sub ON subscription_lines(subscription_id);

-- 9. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL, -- e.g. INV-2026-0001
    subscription_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT CHECK(status IN ('Draft', 'Confirmed', 'Paid', 'Cancelled')) NOT NULL DEFAULT 'Draft',
    subtotal REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    sent_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate billing for the same subscription and period!
    UNIQUE(subscription_id, billing_period_start),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sub ON invoices(subscription_id);

-- 10. Invoice Lines
CREATE TABLE IF NOT EXISTS invoice_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    line_total REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inv_lines_inv ON invoice_lines(invoice_id);

-- 11. Payments
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_number TEXT UNIQUE NOT NULL, -- e.g. PAY-2026-0001
    invoice_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('credit_card', 'bank_transfer', 'stripe', 'paypal', 'cash', 'check')) NOT NULL,
    amount REAL NOT NULL,
    payment_date DATE NOT NULL,
    reference_no TEXT,
    note TEXT,
    created_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 12. Audit Logs / Timeline Events
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL, -- 'subscription', 'invoice', 'payment'
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'created', 'status_changed', 'billed', 'paid', 'sent'
    details TEXT,
    performed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
