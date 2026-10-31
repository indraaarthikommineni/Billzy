const express = require('express');
const router = express.Router();
const { authenticateToken, requireStaffOrAdmin } = require('../middleware/auth');
const { getFinanceDashboardSummary } = require('../services/reportingService');

router.use(authenticateToken);
router.use(requireStaffOrAdmin);

// GET /api/dashboard - Finance Executive Dashboard Summary
router.get('/', (req, res) => {
  const startTime = process.hrtime();

  try {
    const summary = getFinanceDashboardSummary(req.query);

    const diff = process.hrtime(startTime);
    const executionTimeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

    return res.json({
      ...summary,
      executionTimeMs: `${executionTimeMs} ms`
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
