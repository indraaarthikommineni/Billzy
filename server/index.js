const { createApp } = require('./app');
const { seedData } = require('./db/seed');

const PORT = process.env.PORT || 5000;
const app = createApp();

// Seed data on launch
seedData()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Billzy Subscription Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  });
