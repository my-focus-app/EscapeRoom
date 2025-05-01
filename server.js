// server.js
const http = require('http');
const app = require('./index');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// socket.io logic ici si besoin
app.set('io', io);

io.on('connection', socket => {
    // Envoyer l’état actuel à chaque nouvel admin connecté
    socket.emit('initialProgress', app.locals.studentsProgress);
  });
  
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});