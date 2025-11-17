const slugify = require('slugify');
const Room = require('../models/Room');
const User = require('../models/User');

const normalizeSlug = (name) =>
  slugify(name, {
    lower: true,
    strict: true,
  });

const getRooms = async (req, res) => {
  const rooms = await Room.find({}).sort({ createdAt: 1 });
  res.json(rooms);
};

const createRoom = async (req, res) => {
  const { name, isPrivate } = req.body;
  if (!name || name.length < 3) {
    return res.status(400).json({ error: 'Room name must be at least 3 characters' });
  }

  const slug = normalizeSlug(name);
  const exists = await Room.findOne({ slug });
  if (exists) {
    return res.status(400).json({ error: 'Room already exists' });
  }

  const room = await Room.create({
    name,
    slug,
    isPrivate: !!isPrivate,
    participants: [req.user._id],
    createdBy: req.user._id,
  });

  if (!req.user.rooms.includes(room._id)) {
    req.user.rooms.push(room._id);
    await req.user.save();
  }

  res.status(201).json(room);
};

const joinRoom = async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const alreadyIn = room.participants.some((id) => id.equals(req.user._id));
  if (!alreadyIn) {
    room.participants.push(req.user._id);
    await room.save();
  }

  if (!req.user.rooms.includes(room._id)) {
    req.user.rooms.push(room._id);
    await req.user.save();
  }

  res.json(room);
};

const getRoomParticipants = async (req, res) => {
  const { roomId } = req.params;
  const room = await Room.findById(roomId).populate('participants', 'displayName presence avatarColor');
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json(room.participants);
};

const ensurePrivateRoom = async (userAId, userBId) => {
  const sorted = [userAId.toString(), userBId.toString()].sort();
  const slug = `private-${sorted[0]}-${sorted[1]}`;

  let room = await Room.findOne({ slug });
  if (!room) {
    room = await Room.create({
      name: `Private chat`,
      slug,
      isPrivate: true,
      participants: [userAId, userBId],
    });
  } else {
    const participantSet = new Set(room.participants.map((id) => id.toString()));
    if (!participantSet.has(userAId.toString()) || !participantSet.has(userBId.toString())) {
      room.participants = Array.from(new Set([...room.participants, userAId, userBId]));
      await room.save();
    }
  }

  await User.updateMany(
    { _id: { $in: [userAId, userBId] } },
    { $addToSet: { rooms: room._id } }
  );

  return room;
};

const getOrCreatePrivateRoom = async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  if (userId === req.user._id.toString()) {
    return res.status(400).json({ error: 'Cannot create a private room with yourself' });
  }

  const otherUser = await User.findById(userId);
  if (!otherUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const room = await ensurePrivateRoom(req.user._id, otherUser._id);
  res.json(room);
};

module.exports = {
  getRooms,
  createRoom,
  joinRoom,
  getRoomParticipants,
  ensurePrivateRoom,
  getOrCreatePrivateRoom,
};

