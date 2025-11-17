const User = require('../models/User');
const { verifyToken } = require('../utils/token');

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = header.replace('Bearer ', '').trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
};

module.exports = authMiddleware;

