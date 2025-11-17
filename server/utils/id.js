const { randomUUID } = require('crypto');

const generateId = (prefix = 'msg') => `${prefix}_${randomUUID()}`;

module.exports = {
  generateId,
};

