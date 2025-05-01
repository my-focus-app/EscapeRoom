// routes/adminRoutes.js
const express = require('express');
const path = require('path');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  // bloquer franc et net
  return res.sendStatus(403);
}

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.post('/login', (req, res) => {
  if (req.body.password === '0000') {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.status(401).send('Mot de passe incorrect');
});

router.get('/', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

router.post('/start', requireAdmin, (req, res) => {
  req.app.locals.gameStarted = true;
  req.app.locals.gameEndTime = Date.now() + 20 * 60 * 1000;
  res.json({ success: true });
});

router.post('/reset', requireAdmin, (req, res) => {
  req.app.locals.studentsProgress = {};
  req.app.locals.gameStarted = false;
  res.json({ success: true });
});

router.get('/api/progress', requireAdmin, (req, res) => {
  const prog = req.app.locals.studentsProgress || {};
  // on renvoie un tableau de vos progressions
  res.json(Object.values(prog));
});

router.get('/api/isAdmin', (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
  });

module.exports = router;