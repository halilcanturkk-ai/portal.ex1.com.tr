const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { run, get } = require('../db');

const router = express.Router();

// REGISTER (Customer)
router.post('/register', async (req, res) => {
  try {
    const { company_name, full_name, phone, email, password } = req.body;

    if (!company_name || !full_name || !phone || !password) {
      return res.status(400).json({ error: "Eksik alan var." });
    }

    const exists = await get(`SELECT id FROM users WHERE phone=?`, [phone]);
    if (exists) return res.status(409).json({ error: "Bu telefon ile kayıt var." });

    const passHash = await bcrypt.hash(password, 10);
    const id = uuid();

    await run(
      `INSERT INTO users(id, company_name, full_name, phone, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        company_name,
        full_name,
        phone,
        email || '',
        passHash,
        'customer',
        new Date().toISOString()
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.log("REGISTER ERROR", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});


// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await get(`SELECT * FROM users WHERE phone=?`, [phone]);
    if (!user) return res.status(401).json({ error: "Hatalı giriş." });

    if (user.is_active === 0)
      return res.status(403).json({ error: "Hesap pasif durumda." });

    const passOk = await bcrypt.compare(password, user.password_hash);
    if (!passOk) return res.status(401).json({ error: "Hatalı giriş." });

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        full_name: user.full_name,
        company_name: user.company_name
      },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      role: user.role,
      full_name: user.full_name,
      company_name: user.company_name
    });
  } catch (err) {
    console.log("LOGIN ERROR", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;
