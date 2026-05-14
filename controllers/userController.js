const { StatusCodes } = require('http-status-codes');
const { userSchema } = require('../validation/userSchema');
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const pool = require("../db/pg-pool");

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}
const register = async (req, res, next) => {
  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed",
      details: error.details,
    });
  }
  value.hashed_password = await hashPassword(value.password);
  let user = null;
  try {
    user = await pool.query(
      `INSERT INTO users (email, name, hashed_password) 
       VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, value.hashed_password]
    );
  } catch (e) {
    if (e.code === "23505") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email already registered"
      });
    }
    return next(e);
  }
  global.user_id = user.rows[0].id;
  res.status(StatusCodes.CREATED).json({
    name: user.rows[0].name,
    email: user.rows[0].email
  });
};

const logon = async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (result.rows.length === 0) { 
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
  }
  const isMatch = await comparePassword(password, result.rows[0].hashed_password);
  if (!isMatch) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
  }
  global.user_id = result.rows[0].id;
  res.status(StatusCodes.OK).json({ name: result.rows[0].name, email: result.rows[0].email });
};

const logoff = (req, res) => {
  global.user_id = null;
  res.status(StatusCodes.OK).json({ message: "Logged off" });
};

module.exports = { register, logon, logoff, hashPassword, comparePassword };