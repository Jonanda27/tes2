import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms/RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Immediate health check routes for Replit / Cloud Run
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

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

// Resolve client dist path reliably across local and container environments
const possibleDistPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(__dirname, './client/dist')
];
const clientDistPath = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];
const indexPath = path.join(clientDistPath, 'index.html');

// Serve frontend build if exists
app.use(express.static(clientDistPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(200).send('<!DOCTYPE html><html><head><title>Poker Online Texas Hold\'em</title></head><body><h1>Server Poker Online Berjalan</h1><p>Client sedang dimuat atau silakan jalankan vite dev.</p></body></html>');
});

// Socket connection
io.on('connection', (socket) => {
  roomManager.handleSocketConnection(socket);
});

// Listen on all network interfaces ('0.0.0.0') and respect dynamic Cloud Run/Replit PORT
const PORT = Number(process.env.PORT) || (process.env.REPL_ID ? 5000 : 3050);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`♠♥♦♣ Server Poker Online Texas Hold'em berjalan di http://0.0.0.0:${PORT}`);
});
