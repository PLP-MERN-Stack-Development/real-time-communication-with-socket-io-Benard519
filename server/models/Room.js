const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

roomSchema.index({ isPrivate: 1, participants: 1 });

module.exports = mongoose.model('Room', roomSchema);

