const express = require('express');
const router = express.Router();
const { getDatabase } = require('../config/database');
const { authenticateToken, requireStaffOrAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/products - List all products with their variants
router.get('/', (req, res) => {
  const db = getDatabase();
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY id DESC').all();

  const variants = db.prepare('SELECT * FROM product_variants ORDER BY id ASC').all();
  const variantMap = {};
  for (const v of variants) {
    if (!variantMap[v.product_id]) {
      variantMap[v.product_id] = [];
    }
    variantMap[v.product_id].push(v);
  }

  const result = products.map(p => ({
    ...p,
    variants: variantMap[p.id] || []
  }));

  return res.json({ products: result });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(product.id);
  return res.json({ product: { ...product, variants } });
});

// POST /api/products - Admin/Staff create product
router.post('/', requireStaffOrAdmin, (req, res) => {
  try {
    const { name, type = 'software', sales_price, cost_price = 0, notes, variants = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (sales_price === undefined || isNaN(Number(sales_price)) || Number(sales_price) < 0) {
      return res.status(400).json({ error: 'Valid non-negative sales price is required' });
    }

    const validTypes = ['software', 'service', 'add_on', 'hardware'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid product type. Must be one of: ${validTypes.join(', ')}` });
    }

    const db = getDatabase();
    let createdProduct = null;

    db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO products (name, type, sales_price, cost_price, notes)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(name.trim(), type, Number(sales_price), Number(cost_price || 0), notes || null);
      const productId = result.lastInsertRowid;

      if (Array.isArray(variants) && variants.length > 0) {
        const vStmt = db.prepare(`
          INSERT INTO product_variants (product_id, variant_name, price_modifier, sku)
          VALUES (?, ?, ?, ?)
        `);

        for (const v of variants) {
          if (v.variant_name && v.variant_name.trim()) {
            vStmt.run(productId, v.variant_name.trim(), Number(v.price_modifier || 0), v.sku || null);
          }
        }
      }

      createdProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      const insertedVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(productId);
      createdProduct.variants = insertedVariants;
    })();

    return res.status(201).json({
      message: 'Product created successfully',
      product: createdProduct
    });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:id/variants - Add a variant to a product (e.g. Odoo brand adds 560)
router.post('/:id/variants', requireStaffOrAdmin, (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { variant_name, price_modifier = 0, sku } = req.body;

    if (!variant_name || !variant_name.trim()) {
      return res.status(400).json({ error: 'Variant name is required' });
    }

    const db = getDatabase();
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const stmt = db.prepare(`
      INSERT INTO product_variants (product_id, variant_name, price_modifier, sku)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(productId, variant_name.trim(), Number(price_modifier || 0), sku || null);
    const newVariant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Product variant added successfully',
      variant: newVariant
    });
  } catch (err) {
    console.error('Add variant error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
