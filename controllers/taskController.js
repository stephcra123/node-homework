const { StatusCodes } = require('http-status-codes');
const { taskSchema, patchTaskSchema } = require('../validation/taskSchema');
const prisma = require("../db/prisma");

//const taskCounter = (() => {
//  let lastTaskNumber = 0;
//  return () => {
//    lastTaskNumber += 1;
//    return lastTaskNumber;
//  };
//})();

const index = async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: global.user_id },
    select: { title: true, isCompleted: true, id: true }
  });
  if (tasks.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found" });
  }
  res.status(StatusCodes.OK).json(tasks);
};

const create = async (req, res, next) => {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  try {
    const task = await prisma.task.create({
      data: {
        title: value.title,
        isCompleted: value.is_completed ?? false,
        userId: global.user_id
      },
      select: { title: true, isCompleted: true, id: true }
    });
    res.status(StatusCodes.CREATED).json(task);
  } catch (err) {
    return next(err);
  }
};
const show = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: {
        id: parseInt(req.params.id),
        userId: global.user_id
      },
      select: { title: true, isCompleted: true, id: true }
    });
    if (!task) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
    }
    res.status(StatusCodes.OK).json(task);
  } catch (err) {
    return next(err);
  }
};

const update = async (req, res, next) => {
  if (!req.body) req.body = {};
  if (Object.keys(req.body).length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "No attributes to change were specified." });
  }
  const { error, value } = patchTaskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  const id = parseInt(req.params.id);
  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true }
    });
    res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "The task was not found." });
    } else {
      return next(err);
    }
  }
};
const deleteTask = async (req, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const task = await prisma.task.delete({
      where: {
        id,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true }
    });
    res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "The task was not found." });
    } else {
      return next(err);
    }
  }
};

module.exports = { index, create, show, update, deleteTask };