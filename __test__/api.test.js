// __tests__/api.test.js
const request = require('supertest');
const app = require('../index');
const { db } = require('../dataStore');

beforeAll(() => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          teamName TEXT PRIMARY KEY,
          avatar TEXT,
          startTime INTEGER,
          endTime INTEGER
        );
      `, err => err ? reject(err) : resolve());
    });
  });
});

afterAll(() => new Promise(resolve => db.close(resolve)));

describe('POST /set-team', () => {
  test('crée une équipe sans avatar', async () => {
    const res = await request(app)
      .post('/set-team')
      .field('teamName', 'TeamTest');
    
    expect(res.statusCode).toBe(302);  // Redirigé vers /waiting

    const row = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM students WHERE teamName = ?`, ['TeamTest'], (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });

    expect(row).toBeDefined();
    expect(row.avatar).toBeNull();
  });

  test('crée une équipe avec avatar', async () => {
    const res = await request(app)
      .post('/set-team')
      .field('teamName', 'TeamWithAvatar')
      .attach('avatarFile', Buffer.from('fakeimagecontent'), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg'
      })

    expect(res.statusCode).toBe(302);

    const row = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM students WHERE teamName = ?`, ['TeamWithAvatar'], (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });

    expect(row).toBeDefined();
    expect(row.avatar).toMatch(/^\/uploads\/.+\.jpg$/);
  });
});

describe('Sécurité des routes admin', () => {
  test('GET /admin renvoie 403 si non connecté', async () => {
    const res = await request(app).get('/admin');
    expect(res.statusCode).toBe(403);
  });

  test('GET /admin renvoie 200 si admin', async () => {
    const agent = request.agent(app);
    await agent.post('/admin/login').send({ password: '0000' });
    const res = await agent.get('/admin');
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /admin/api/progress', () => {
  test('renvoie un JSON contenant la liste des équipes', async () => {
    const agent = request.agent(app);
    await agent.post('/admin/login').send({ password: '0000' });
    const res = await agent.get('/admin/api/progress');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});