import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms/RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager(io);

// API endpoint to list active rooms
app.get('/api/rooms', (req, res) => {
  res.json(roomManager.listRooms());
});

// API endpoint to list active 3D lounge players
app.get('/api/lobby-players', (req, res) => {
  res.json(roomManager.getLobbyPlayers());
});

// API endpoint to get leaderboard (Top Players by Balance)
app.get('/api/leaderboard', (req, res) => {
  res.json(roomManager.getLeaderboard(15));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend build if exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.send('Server Poker Online berjalan. Silakan jalankan client Vite di port 5173 atau build client.');
    }
  });
});

// Socket connection
io.on('connection', (socket) => {
  roomManager.handleSocketConnection(socket);
});

const PORT = process.env.PORT || 3050;
httpServer.listen(PORT, () => {
  console.log(`♠♥♦♣ Server Poker Online Texas Hold'em berjalan di http://localhost:${PORT}`);
});
