require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const authMiddleware = require('./middleware/auth');
const { login, profile } = require('./controllers/authController');
const {
  getRooms,
  createRoom,
  joinRoom,
  getRoomParticipants,
  getOrCreatePrivateRoom,
} = require('./controllers/roomController');
const {
  getRoomMessages,
  markRead,
  getUnreadCount,
} = require('./controllers/messageController');
const { listUsers } = require('./controllers/userController');
const initializeSocket = require('./socket');

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', login);
app.get('/api/auth/me', authMiddleware, profile);

app.get('/api/rooms', authMiddleware, getRooms);
app.post('/api/rooms', authMiddleware, createRoom);
app.post('/api/rooms/:roomId/join', authMiddleware, joinRoom);
app.post('/api/rooms/private', authMiddleware, getOrCreatePrivateRoom);
app.get('/api/rooms/:roomId/participants', authMiddleware, getRoomParticipants);
app.get('/api/rooms/:id/messages', authMiddleware, getRoomMessages);
app.post('/api/messages/:messageId/read', authMiddleware, markRead);
app.get('/api/unread', authMiddleware, getUnreadCount);
app.get('/api/users', authMiddleware, listUsers);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  initializeSocket(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();

