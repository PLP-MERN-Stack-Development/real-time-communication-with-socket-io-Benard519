const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    displayName: {
      type: String,
      required: true,
    },
    avatarColor: {
      type: String,
      default: '#60a5fa',
    },
    rooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
      },
    ],
    presence: {
      type: presenceSchema,
      default: () => ({ status: 'offline', lastActiveAt: new Date() }),
    },
    lastSocketId: String,
    notifications: {
      unreadCount: {
        type: Number,
        default: 0,
      },
      lastBell: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

userSchema.methods.markOnline = function markOnline(socketId) {
  this.presence.status = 'online';
  this.presence.lastActiveAt = new Date();
  this.lastSocketId = socketId;
};

userSchema.methods.markOffline = function markOffline() {
  this.presence.status = 'offline';
  this.presence.lastActiveAt = new Date();
  this.lastSocketId = null;
};

module.exports = mongoose.model('User', userSchema);

