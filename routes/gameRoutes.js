// routes/gameRoutes.js
const express = require('express');
const path = require('path');
const dataStore = require('../dataStore');
const { body, validationResult } = require('express-validator');

const router = express.Router();

function requireProgress(postenNumber) {
  return (req, res, next) => {
    const team = req.session.teamName;
    const data = req.app.locals.studentsProgress?.[team] || {};
    if (postenNumber === 1 || data[`posten${postenNumber - 1}`]) {
      return next();
    }
    res.redirect('/waiting');
  };
}

router.get(['/', '/home'], (req, res) => {
  res.sendFile(path.join(__dirname, '../views/home.html'));
});

router.get(['/accueil'], (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

router.get('/waiting', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/waiting.html'));
});

router.get('/results', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/results.html'));
});

router.post(
  '/set-team',
  (req, res, next) => {
    if (!req.upload || !req.upload.single) {
      return res.status(500).send('Multer non initialisé');
    }
    req.upload.single('avatarFile')(req, res, next);
  },
  /* … multipart/form-data middleware … */
  // 2) validation
  body('teamName')
    .trim()
    .notEmpty().withMessage('Der Teamname ist erforderlich.')
    .isLength({ max: 30 }).withMessage('30 Zeichen max.')
    .custom(async name => {
      const all = await dataStore.getAll();
      if (Object.keys(all).includes(name)) throw new Error('Bereits vergebener Name.');
      return true;
    }),
  // 3) handler
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamName } = req.body;
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      await dataStore.addTeam({ teamName, avatar: avatarUrl });

      // On met aussi à jour directement l’état en mémoire pour l’admin
      req.app.locals.studentsProgress = req.app.locals.studentsProgress || {};
      req.app.locals.studentsProgress[teamName] = {
        name:      teamName,
        avatar:    avatarUrl,
        startTime: null,
        endTime:   null,
        posten1:   false,
        posten2:   false,
        posten3:   false,
        finalCode: false
      };

      // —— NOUVEAU : notifier le dashboard admin dès qu’une équipe est créée ——
      const io = req.app.get('io');
      if (io) {
        io.emit('newTeam', req.app.locals.studentsProgress[teamName]);
      }
      // ————————————————————————————————————————————————————————————————

      // On garde le nom en session et on redirige le joueur
      req.session.teamName = teamName;
      return res.redirect('/waiting');

    } catch (err) {
      next(err);
    }
  }
);

router.get('/posten1', requireProgress(1), (req, res) => {
  res.sendFile(path.join(__dirname, '../views/posten1.html'));
});
router.get('/posten2', requireProgress(2), (req, res) => {
  res.sendFile(path.join(__dirname, '../views/posten2.html'));
});
router.get('/posten3', requireProgress(3), (req, res) => {
  res.sendFile(path.join(__dirname, '../views/posten3.html'));
});
router.get('/posten4', requireProgress(3), (req, res) => {
  res.sendFile(path.join(__dirname, '../views/posten4.html'));
});

router.post('/progress/:posten', async (req, res) => {
  console.log('🔄 updateProgress', req.session.teamName, req.params.posten);
  const field = req.params.posten;
  const teamName = req.session.teamName;
  const value = 1;
  await dataStore.updateProgress(teamName, field, value);
  await dataStore.reloadInto(req.app);
  const io = req.app.get('io');
    if (io) {
      io.emit('teamProgress', { team: teamName, posten: field });
    }
  res.json({ success: true });
});

router.post('/submit-answer', async (req, res) => {
  const { posten, answer } = req.body;
  const team = req.session.teamName;

  if (!team || !posten || !answer) {
    return res.status(400).json({ error: 'Requête invalide' });
  }

  const correctAnswers = {
    posten1: '42',
    posten2: 'chat',
    posten3: 'clé',
  };

  if (answer.trim().toLowerCase() === correctAnswers[posten]) {
    const value = 1;
    await dataStore.updateProgress(team, posten, value);
    await dataStore.reloadInto(req.app);
  
    const io = req.app.get('io');
    if (io) io.emit('teamProgress', { team: team, posten });
  
    return res.json({ success: true });
  } else {
    return res.json({ success: false, message: 'Mauvaise réponse' });
  }
});

router.get('/api/status', (req, res) => {
  const gameEndTime = req.app.locals.gameEndTime;
  const timeLeft = gameEndTime ? Math.max(0, gameEndTime - Date.now()) : null;
  res.json({ gameStarted: req.app.locals.gameStarted, timeLeft });
});

router.get('/api/me', (req, res) => {
  const teamName = req.session.teamName;
  const teamData = req.app.locals.studentsProgress?.[teamName];
  if (!teamData) return res.status(404).json({ error: 'not found' });
  res.json({ name: teamData.name, avatar: teamData.avatar });
});

module.exports = router;