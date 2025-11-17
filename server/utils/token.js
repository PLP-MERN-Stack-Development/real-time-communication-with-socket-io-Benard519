const jwt = require('jsonwebtoken');

const JWT_TTL = '12h';

const createToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'supersecret', {
    expiresIn: JWT_TTL,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
  } catch (error) {
    return null;
  }
};

module.exports = {
  createToken,
  verifyToken,
};

