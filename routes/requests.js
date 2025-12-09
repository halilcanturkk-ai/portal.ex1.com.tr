const express = require('express');
const multer = require('multer');
const { run, get, all } = require('../db');
const { v4: uuid } = require('uuid');
const path = require('path');
const fs = require('fs');
const { sendEmail } = require('../notify');

const router = express.Router();

// MULTER STORAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const id = uuid();
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, id + "_" + safeName);
  }
});
const upload = multer({ storage });

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
function requireAuth(req, res, next) {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "Yetkisiz" });
  req.user = user;
  next();
}

// CREATE REQUEST (Müşteri EX1 talebi açar)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { exit_office, eori_number, notes } = req.body;

    if (!exit_office || !eori_number)
      return res.status(400).json({ error: "Eksik bilgi." });

    const id = uuid();
    await run(
      `INSERT INTO requests(id, user_id, exit_office, eori_number, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        exit_office,
        eori_number,
        notes || '',
        'pending',
        new Date().toISOString()
      ]
    );

    res.json({ ok: true, id });
  } catch (err) {
    console.log("REQUEST CREATE ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// CUSTOMER UPLOAD DOCUMENT
router.post('/:id/upload', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    const reqId = req.params.id;

    for (const file of req.files) {
      const displayName =
        `${reqId}_customer_${new Date().toISOString().replace(/[:.]/g, '-')}_${file.originalname}`;

      await run(
        `INSERT INTO documents(id, request_id, original_name, display_name, stored_name, mime_type, size_bytes, created_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(),
          reqId,
          file.originalname,
          displayName,
          file.filename,
          file.mimetype,
          file.size,
          new Date().toISOString(),
          'customer'
        ]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.log("UPLOAD ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ADMIN UPLOAD DOCUMENT (admin işlem evrağı yükler)
router.post('/:id/admin-upload', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: "Admin değil." });

    const reqId = req.params.id;

    for (const file of req.files) {
      const displayName =
        `${reqId}_admin_${new Date().toISOString().replace(/[:.]/g, '-')}_${file.originalname}`;

      await run(
        `INSERT INTO documents(id, request_id, original_name, display_name, stored_name, mime_type, size_bytes, created_at, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid(),
          reqId,
          file.originalname,
          displayName,
          file.filename,
          file.mimetype,
          file.size,
          new Date().toISOString(),
          'admin'
        ]
      );
    }

    // SEND EMAIL NOTIFICATION
    const info = await get(`
      SELECT r.id, r.exit_office, r.eori_number,
             u.email, u.full_name, u.company_name
      FROM requests r
      JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `, [reqId]);

    if (info && info.email) {
      const html = `
        <h3>Sayın ${info.full_name},</h3>
        <p>EX1 talebiniz için işlem evrakları yüklenmiştir.</p>
        <p><b>Firma:</b> ${info.company_name}</p>
        <p><b>Talep No:</b> ${info.id}</p>
        <p><b>Çıkış Kapısı:</b> ${info.exit_office}</p>
        <p><b>EORI:</b> ${info.eori_number}</p>
        <p>Portal üzerinden evrakları indirebilirsiniz.</p>
        <p>Zirve Trans</p>
      `;
      sendEmail({
        to: info.email,
        subject: "EX1 Talebi İçin İşlem Evrakları Yüklendi",
        html
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.log("ADMIN UPLOAD ERROR:", err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// LIST REQUESTS FOR USER
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows =
      req.user.role === 'admin'
        ? await all(`SELECT * FROM requests ORDER BY created_at DESC`)
        : await all(`SELECT * FROM requests WHERE user_id=? ORDER BY created_at DESC`, [req.user.id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// LIST DOCUMENTS OF REQUEST
router.get('/:id/documents', requireAuth, async (req, res) => {
  try {
    const docs = await all(`SELECT * FROM documents WHERE request_id=? ORDER BY created_at DESC`, [
      req.params.id
    ]);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;
