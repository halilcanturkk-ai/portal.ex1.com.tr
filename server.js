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

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;

initDb().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => console.log(`Portal running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB init error', err);
  process.exit(1);
});
