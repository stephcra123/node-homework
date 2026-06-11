const { StatusCodes } = require('http-status-codes');
const { userSchema } = require('../validation/userSchema');
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const prisma = require("../db/prisma");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

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
const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "Strict" : "None",
  };
};
const setJwtCookie = (req, res, user) => {
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 });
  return payload.csrfToken;
};

const register = async (req, res, next) => {
  if (!req.body) req.body = {};
let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const data = await response.json();
    if (data.success) isPerson = true;
    delete req.body.recaptchaToken;
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    isPerson = true;
  }
  if (!isPerson) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Bot verification failed. Please complete the reCAPTCHA." });
  }
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed",
      details: error.details,
    });
  }
  const hashedPassword = await hashPassword(value.password);
  const { name, email } = value;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, name, hashedPassword },
        select: { id: true, email: true, name: true }
      });
      const welcomeTaskData = [
        { title: "Complete your profile", userId: newUser.id, priority: "medium" },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" }
      ];
      await tx.task.createMany({ data: welcomeTaskData });
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map(t => t.title) }
        },
        select: { id: true, title: true, isCompleted: true, userId: true, priority: true }
      });
      return { user: newUser, welcomeTasks };
    });
    
const csrfToken = setJwtCookie(req, res, result.user);  
    res.status(StatusCodes.CREATED).json({
      user: result.user, 
      name: result.user.name,
      email: result.user.email,
      csrfToken,                                            
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success"
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    if (err.code === "P2002") {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Email already registered" });
    } else {
      return next(err);
    }
  }
};

const logon = async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      hashedPassword: true
    }
  });
  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
  }
  const isMatch = await comparePassword(password, user.hashedPassword);
  if (!isMatch) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication Failed" });
  }
  const csrfToken = setJwtCookie(req, res, user);  
  res.status(StatusCodes.OK).json({ name: user.name, email: user.email, csrfToken });
};

const logoff = (req, res) => {
  res.clearCookie("jwt", cookieFlags(req));
  res.status(StatusCodes.OK).json({ message: "Logged off" });
};

module.exports = { register, logon, logoff, hashPassword, comparePassword };