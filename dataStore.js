// dataStore.js
const path = require('path');
const Database = require('better-sqlite3');

// Create or open the SQLite database (in-memory for tests)
function createDb(filename = path.join(__dirname, 'data.sqlite')) {
  return new Database(filename);
}
const db = createDb(process.env.NODE_ENV === 'test' ? ':memory:' : path.join(__dirname, 'data.sqlite'));

// Initialize the students table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    teamName   TEXT PRIMARY KEY,
    avatar     TEXT,
    startTime  TEXT,
    endTime    TEXT,
    posten1    INTEGER DEFAULT 0,
    posten2    INTEGER DEFAULT 0,
    posten3    INTEGER DEFAULT 0,
    finalCode  INTEGER DEFAULT 0,
    createdAt  TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Retrieve all students as an object
function getAll() {
  return new Promise((resolve, reject) => {
    try {
      const rows = db.prepare('SELECT * FROM students').all();
      const data = {};
      rows.forEach(r => {
        data[r.teamName] = {
          name:      r.teamName,
          avatar:    r.avatar,
          startTime: r.startTime,
          endTime:   r.endTime,
          posten1:   !!r.posten1,
          posten2:   !!r.posten2,
          posten3:   !!r.posten3,
          finalCode: !!r.finalCode
        };
      });
      resolve(data);
    } catch (err) {
      reject(err);
    }
  });
}

function removeTeam(teamName) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM students WHERE teamName = ?', [teamName], err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Add or replace a team entry
function addTeam({ teamName, avatar }) {
  return new Promise((resolve, reject) => {
    try {
      db.prepare(
        `INSERT OR REPLACE INTO students
         (teamName, avatar, startTime, endTime)
         VALUES (?, ?, NULL, NULL)`
      ).run(teamName, avatar);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

// Update a specific progress field for a team
function updateProgress(teamName, field, value) {
  const allowedFields = ['startTime', 'endTime', 'posten1', 'posten2', 'posten3', 'finalCode'];
  if (!allowedFields.includes(field)) {
    return Promise.reject(new Error('Invalid field name'));
  }

  return new Promise((resolve, reject) => {
    try {
      const sql = `UPDATE students SET ${field} = ? WHERE teamName = ?`;
      db.prepare(sql).run(value, teamName);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

// Reload all data into app.locals
function reloadInto(app) {
  return getAll().then(data => {
    app.locals.studentsProgress = data;
  });
}

// Export all utilities
module.exports = {
  db,
  getAll,
  addTeam,
  updateProgress,
  reloadInto,
  removeTeam
};