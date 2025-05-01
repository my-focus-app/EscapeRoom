// index.js
const express = require('express')
const app = express();;
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const cron = require('node-cron');
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 20 // 20 minutes
  }
}));

const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const dataStore = require('./dataStore');

const uploadsDir = path.join(__dirname, 'public', 'uploads');

dataStore.getAll().then(data => {
  app.locals.studentsProgress = data;
  app.locals.gameStarted = false;
  app.locals.gameEndTime = null;
});

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use((req, res, next) => {
  if (!req.session.userId) req.session.userId = uuidv4();
  next();
});

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 Mo
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Seuls JPEG, PNG et GIF sont autorisés'));
    }
    cb(null, true);
  }
});

app.use((req, res, next) => {
  req.upload = upload;
  next();
});

cron.schedule('0 1 * * *', () => {
  const db = require('./dataStore').db;
  db.run(
    `DELETE FROM students
     WHERE startTime IS NULL
     AND julianday('now') - julianday(createdAt) > 1`,
    err => {
      if (err) console.error('❌ Erreur purge équipes abandonnées :', err);
      else console.log('🧼 Purge équipes abandonnées effectuée');
    }
  );
});

cron.schedule('0 2 * * *', async () => {
  const rows = await dataStore.getAll();
  const used = new Set(Object.values(rows).map(r => {
    const m = r.avatar && r.avatar.match(/\/uploads\/(.+)$/);
    return m && m[1];
  }).filter(Boolean));

  fs.readdir(uploadsDir, (err, files) => {
    if (err) return console.error(err);
    for (const file of files) {
      if (!used.has(file)) {
        fs.unlink(path.join(uploadsDir, file), () => {});
      }
    }
  });
});

// Import des routes
const gameRoutes = require('./routes/gameRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Montage des routes
app.use('/', gameRoutes);
app.use('/admin', adminRoutes);

module.exports = app;
