const User = require('../models/User');

const listUsers = async (req, res) => {
  const users = await User.find({}, 'displayName username avatarColor presence updatedAt createdAt').sort({
    displayName: 1,
  });

  res.json(
    users.map((user) => ({
      id: user._id,
      displayName: user.displayName,
      username: user.username,
      avatarColor: user.avatarColor,
      presence: user.presence,
      lastSeen: user.updatedAt,
    }))
  );
};

module.exports = {
  listUsers,
};



