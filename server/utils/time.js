const now = () => new Date();

const toUnix = (date) => Math.floor(new Date(date).getTime() / 1000);

module.exports = {
  now,
  toUnix,
};

