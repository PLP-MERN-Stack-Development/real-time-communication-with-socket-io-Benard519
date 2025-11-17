const mongoose = require('mongoose');
const Message = require('../models/Message');

const getRoomMessages = async (req, res) => {
  const { id } = req.params;
  const { before, limit = 20 } = req.query;

  const roomId = new mongoose.Types.ObjectId(id);
  const query = { roomId };
  if (before) {
    query.ts = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .sort({ ts: -1 })
    .limit(Number(limit))
    .lean();

  res.json(messages.reverse());
};

const markRead = async (req, res) => {
  const { messageId } = req.params;
  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const alreadyRead = message.readBy.some((id) => id.equals(req.user._id));
  if (!alreadyRead) {
    message.readBy.push(req.user._id);
    message.meta.acknowledgement = 'read';
    await message.save();
  }

  res.json({ messageId: message._id, readBy: message.readBy });
};

const getUnreadCount = async (req, res) => {
  const roomIds = req.user.rooms;
  const match = { roomId: { $in: roomIds } };
  if (req.query.since) {
    match.ts = { $gte: new Date(req.query.since) };
  }

  const result = await Message.aggregate([
    { $match: match },
    {
      $project: {
        roomId: 1,
        unread: {
          $cond: [
            {
              $in: [req.user._id, '$readBy'],
            },
            0,
            1,
          ],
        },
      },
    },
    {
      $group: {
        _id: '$roomId',
        unread: { $sum: '$unread' },
      },
    },
  ]);

  res.json(result);
};

module.exports = {
  getRoomMessages,
  markRead,
  getUnreadCount,
};

