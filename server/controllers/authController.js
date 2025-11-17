const User = require('../models/User');
const Room = require('../models/Room');
const { createToken } = require('../utils/token');
const { now } = require('../utils/time');

const COLOR_PALETTE = [
  '#60a5fa',
  '#34d399',
  '#f472b6',
  '#f97316',
  '#a78bfa',
  '#facc15',
];

const ensureGlobalRoom = async () => {
  let room = await Room.findOne({ slug: 'global' });
  if (!room) {
    room = await Room.create({
      name: 'Global Chat',
      slug: 'global',
      isPrivate: false,
      participants: [],
    });
  }
  return room;
};

const login = async (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  const displayName = username.trim();
  const existing = await User.findOne({ username: displayName.toLowerCase() });

  let user = existing;
  if (!existing) {
    const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    user = await User.create({
      username: displayName.toLowerCase(),
      displayName,
      avatarColor: color,
      presence: { status: 'offline', lastActiveAt: now() },
    });
  }

  const token = createToken({ userId: user._id, username: user.username });
  const room = await ensureGlobalRoom();
  if (!user.rooms.includes(room._id)) {
    user.rooms.push(room._id);
    await user.save();
  }

  res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      rooms: user.rooms,
      presence: user.presence,
    },
    defaultRoom: room,
  });
};

const profile = async (req, res) => {
  const user = req.user;
  res.json({
    user: {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      presence: user.presence,
      rooms: user.rooms,
    },
  });
};

module.exports = {
  login,
  profile,
  ensureGlobalRoom,
};

