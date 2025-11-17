const { Server } = require('socket.io');
const Message = require('../models/Message');
const User = require('../models/User');
const Room = require('../models/Room');
const { ensureGlobalRoom } = require('../controllers/authController');
const { ensurePrivateRoom } = require('../controllers/roomController');
const { verifyToken } = require('../utils/token');
const { now } = require('../utils/time');
const { generateId } = require('../utils/id');

const CONNECTION_TIMEOUT_MS = 4000;

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  const onlineUsers = new Map(); // userId => socketId
  const userRooms = new Map(); // userId => Set(roomId)

  io.use(async (socket, next) => {
    const headerToken = socket.handshake.headers?.authorization;
    const token = socket.handshake.auth?.token || (headerToken ? headerToken.replace('Bearer ', '').trim() : null);
    if (!token) {
      return next(new Error('Not authenticated'));
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('User not found'));
    }
    socket.user = user;
    next();
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user._id.toString();
    onlineUsers.set(userId, socket.id);
    userRooms.set(userId, new Set(user.rooms.map((id) => id.toString())));

    user.markOnline(socket.id);
    await user.save();

    const globalRoom = await ensureGlobalRoom();
    if (!userRooms.get(userId).has(globalRoom._id.toString())) {
      userRooms.get(userId).add(globalRoom._id.toString());
      socket.user.rooms.push(globalRoom._id);
      await socket.user.save();
    }

    for (const roomId of userRooms.get(userId)) {
      socket.join(roomId);
    }

    socket.emit('auth', {
      status: 'ok',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
      },
      rooms: Array.from(userRooms.get(userId)),
    });

    io.emit('presence', { userId, username: user.displayName, online: true, ts: now() });

    socket.on('joinRoom', async ({ roomId }, ack) => {
      try {
        if (!roomId) throw new Error('roomId required');
        const room = await Room.findById(roomId);
        if (!room) throw new Error('Room not found');

        socket.join(roomId);
        userRooms.get(userId).add(roomId.toString());

        const alreadyIn = room.participants.some((id) => id.equals(user._id));
        if (!alreadyIn) {
          room.participants.push(user._id);
          await room.save();
        }

        if (!socket.user.rooms.includes(room._id)) {
          socket.user.rooms.push(room._id);
          await socket.user.save();
        }

        io.to(roomId).emit('notification', {
          type: 'user-joined',
          roomId,
          message: `${user.displayName} joined room`,
          ts: now(),
        });

        if (ack) ack({ ok: true });
      } catch (error) {
        if (ack) ack({ ok: false, error: error.message });
      }
    });

    socket.on('sendMessage', async (payload, ack) => {
      try {
        const { roomId, text, clientMessageId } = payload;
        if (!roomId || !text) throw new Error('Missing roomId or text');
        if (!userRooms.get(userId).has(roomId.toString())) {
          throw new Error('Join room first');
        }
        const resolvedClientId = clientMessageId || generateId('client');
        const message = await Message.create({
          roomId,
          from: user._id,
          fromName: user.displayName,
          text,
          ts: now(),
          readBy: [user._id],
          meta: { acknowledgement: 'delivered', clientMessageId: resolvedClientId },
        });

        const enriched = message.toObject();
        await Room.findByIdAndUpdate(roomId, { lastMessageAt: message.ts }).catch(() => {});
        io.to(roomId).emit('newMessage', enriched);
        io.to(roomId).emit('notification', {
          type: 'message',
          roomId,
          messageId: message._id,
          fromName: user.displayName,
          text,
          ts: message.ts,
        });

        if (ack) {
          ack({ ok: true, serverMessageId: message._id, clientMessageId: resolvedClientId });
        }
      } catch (error) {
        if (ack) ack({ ok: false, error: error.message });
      }
    });

    socket.on('privateMessage', async ({ toUserId, text, clientMessageId }, ack) => {
      try {
        if (!toUserId || !text) throw new Error('Missing fields');
        const room = await ensurePrivateRoom(user._id, toUserId);
        const roomIdStr = room._id.toString();
        userRooms.get(userId).add(roomIdStr);
        socket.join(roomIdStr);

        const resolvedClientId = clientMessageId || generateId('client');
        const message = await Message.create({
          roomId: room._id,
          from: user._id,
          fromName: user.displayName,
          toUserId,
          text,
          ts: now(),
          readBy: [user._id],
          meta: { acknowledgement: 'delivered', clientMessageId: resolvedClientId },
        });

        const enriched = message.toObject();
        await Room.findByIdAndUpdate(room._id, { lastMessageAt: message.ts }).catch(() => {});
        io.to(roomIdStr).emit('newMessage', enriched);

        const targetUserKey = toUserId.toString();
        const targetSocketId = onlineUsers.get(targetUserKey);
        if (targetSocketId) {
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.join(roomIdStr);
            userRooms.get(targetUserKey)?.add(roomIdStr);
          }
          io.to(targetSocketId).emit('notification', {
            type: 'private',
            roomId: room._id,
            fromName: user.displayName,
            messageId: message._id,
            ts: message.ts,
            text,
          });
        }

        if (ack) {
          ack({
            ok: true,
            serverMessageId: message._id,
            clientMessageId: resolvedClientId,
            roomId: room._id,
          });
        }
      } catch (error) {
        if (ack) ack({ ok: false, error: error.message });
      }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      if (!roomId) return;
      socket.to(roomId).emit('typing', {
        roomId,
        userId,
        username: user.displayName,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on('messageRead', async ({ messageId, roomId }) => {
      if (!messageId) return;
      const message = await Message.findById(messageId);
      if (!message) return;
      const already = message.readBy.some((id) => id.equals(user._id));
      if (!already) {
        message.readBy.push(user._id);
        message.meta.acknowledgement = 'read';
        await message.save();
      }
      io.to(roomId || message.roomId.toString()).emit('messageRead', {
        messageId: message._id,
        by: userId,
      });
    });

    socket.on('presence', async (_, ack) => {
      const payload = {
        userId,
        username: user.displayName,
        online: true,
        ts: now(),
      };
      io.emit('presence', payload);
      if (ack) ack(payload);
    });

    socket.on('reconnect', async (_, ack) => {
      try {
        const savedRooms = await Room.find({ _id: { $in: socket.user.rooms } }, '_id');
        savedRooms.forEach((room) => {
          socket.join(room._id.toString());
          userRooms.get(userId).add(room._id.toString());
        });
        if (ack) ack({ ok: true, rooms: savedRooms.map((room) => room._id.toString()) });
      } catch (error) {
        if (ack) ack({ ok: false, error: error.message });
      }
    });

    socket.on('disconnect', async () => {
      setTimeout(async () => {
        const current = onlineUsers.get(userId);
        if (current && current !== socket.id) return;
        onlineUsers.delete(userId);
        userRooms.delete(userId);
        socket.user.markOffline();
        await socket.user.save();
        io.emit('presence', {
          userId,
          username: socket.user.displayName,
          online: false,
          ts: now(),
        });
        io.emit('notification', {
          type: 'user-left',
          userId,
          message: `${socket.user.displayName} went offline`,
          ts: now(),
        });
      }, CONNECTION_TIMEOUT_MS);
    });
  });

  return io;
};

module.exports = initializeSocket;

