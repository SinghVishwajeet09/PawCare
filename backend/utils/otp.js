const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);

const generateCode = () => String(crypto.randomInt(100000, 1000000));

const hashCode = async (code) => bcrypt.hash(code, 10);

const compareCode = async (code, hash) => {
  if (!code || !hash) return false;
  return bcrypt.compare(String(code).trim(), hash);
};

const expiresAt = () => new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

module.exports = {
  OTP_TTL_MINUTES,
  compareCode,
  expiresAt,
  generateCode,
  hashCode
};
