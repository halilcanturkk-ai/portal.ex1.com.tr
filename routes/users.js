const express = require('express');
const { all, run } = require('../db');
const router = express.Router();

// AUTH MIDDLEWARE
function auth(req) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return null;
    return require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}
function requireAdmin(req, res, next) {
  const user = auth(req);
  if (!user || user.role !== 'admin')
    return res.status(403).json({ error: "Admin değil." });
  req.user = user;
  next();
}

// LIST USERS (Admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await all(`
      SELECT id, company_name, full_name, phone, email, role,
             price_per_request, currency, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(users);
  } catch (err) {
    console.log("USER LIST ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// UPDATE USER SETTINGS
router.post('/update', requireAdmin, async (req, res) => {
  try {
    const { id, price_per_request, currency, is_active } = req.body;

    await run(
      `UPDATE users
       SET price_per_request=?, currency=?, is_active=?
       WHERE id=?`,
      [
        price_per_request || 0,
        currency || 'EUR',
        is_active ? 1 : 0,
        id
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.log("USER UPDATE ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;
