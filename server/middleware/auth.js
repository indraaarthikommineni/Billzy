const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'brightloop-odoo-secret-key-2026-xyz';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    const db = getDatabase();
    const user = db.prepare('SELECT id, email, name, role, company_name FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: this action requires one of the following roles: [${roles.join(', ')}]. Current role: ${req.user.role}`
      });
    }
    next();
  };
}

const requireAdmin = requireRole('admin');
const requireStaffOrAdmin = requireRole('admin', 'staff');

module.exports = {
  JWT_SECRET,
  generateToken,
  authenticateToken,
  requireRole,
  requireAdmin,
  requireStaffOrAdmin
};
