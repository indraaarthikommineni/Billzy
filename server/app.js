const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');

const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const productsRoutes = require('./routes/products');
const plansRoutes = require('./routes/plans');
const templatesRoutes = require('./routes/templates');
const subscriptionsRoutes = require('./routes/subscriptions');
const invoicesRoutes = require('./routes/invoices');
const billingRoutes = require('./routes/billing');
const paymentsRoutes = require('./routes/payments');
const discountsRoutes = require('./routes/discounts');
const taxesRoutes = require('./routes/taxes');
const dashboardRoutes = require('./routes/dashboard');
const portalRoutes = require('./routes/portal');

function createApp(dbPath) {
  // Initialize Database
  initDatabase(dbPath);

  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Billzy Subscription Management API',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/plans', plansRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/subscriptions', subscriptionsRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/discounts', discountsRoutes);
  app.use('/api/taxes', taxesRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/portal', portalRoutes);

  // Serve static client build if present
  const clientDistPath = require('path').join(__dirname, '..', 'client', 'dist');
  if (require('fs').existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(require('path').join(clientDistPath, 'index.html'));
      }
      next();
    });
  }

  // 404 handler for unmatched routes
  app.use((req, res) => {
    res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error'
    });
  });

  return app;
}

module.exports = { createApp };
