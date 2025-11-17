const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fromName: {
      type: String,
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    ts: {
      type: Date,
      default: Date.now,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    meta: {
      acknowledgement: {
        type: String,
        default: 'pending',
        enum: ['pending', 'delivered', 'read'],
      },
      clientMessageId: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, ts: -1 });
messageSchema.index({ toUserId: 1, ts: -1 });

module.exports = mongoose.model('Message', messageSchema);

