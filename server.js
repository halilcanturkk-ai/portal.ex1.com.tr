require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, seedAdmin } = require('./db');

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const userRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// STATIC FILES (LOGIN, DASHBOARD, ADMIN)
app.use(express.static(path.join(__dirname, 'public')));

// API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);

// HEALTH CHECK
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// PORT
const PORT = process.env.PORT || 10000;

// START SERVER
initDb().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => console.log(`EX1 Portal running on port ${PORT}`));
}).catch(err => {
  console.error('DB INIT ERROR:', err);
  process.exit(1);
});
