const { StatusCodes } = require('http-status-codes');
const { userSchema } = require('../validation/userSchema');
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const prisma = require("../db/prisma");

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

   const hashedPassword = await hashPassword(value.password);
  const { name, email } = value;
  let user = null;
  try {
    user = await prisma.user.create({
      data: { name, email, hashedPassword },
      select: { name: true, email: true, id: true }
    });
  } catch (err) {
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email already registered"
      });
    } else {
      return next(err);
    }
  }
  global.user_id = user.id;
  res.status(StatusCodes.CREATED).json({
    name: user.name,
    email: user.email
  });
};
const logon = async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
  }
  const isMatch = await comparePassword(password, user.hashedPassword);
  if (!isMatch) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
  }
  global.user_id = user.id;
  res.status(StatusCodes.OK).json({ name: user.name, email: user.email });
};
const logoff = (req, res) => {
  global.user_id = null;
  res.status(StatusCodes.OK).json({ message: "Logged off" });
};

module.exports = { register, logon, logoff, hashPassword, comparePassword };