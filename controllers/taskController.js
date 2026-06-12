const { StatusCodes } = require('http-status-codes');
const { taskSchema, patchTaskSchema } = require('../validation/taskSchema');
const prisma = require("../db/prisma");

const getOrderBy = (query) => {
  const validSortFields = ["title", "priority", "createdAt", "id", "isCompleted"];
  const sortBy = query.sortBy || "createdAt";
  const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";
  if (validSortFields.includes(sortBy)) {
    return { [sortBy]: sortDirection };
  }
  return { createdAt: "desc" };
};

const index = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;

    const whereClause = { userId: req.user.id, trash: false };
    if (req.query.find) {
      whereClause.title = {
        contains: req.query.find,
        mode: 'insensitive'
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: {
          select: { name: true, email: true }
        }
      },
      skip,
      take: limit,
      orderBy: getOrderBy(req.query)
    });
    const totalTasks = await prisma.task.count({ where: whereClause });
    if (totalTasks === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found" });
    }

    const pagination = {
      page,
      limit,
      total: totalTasks,
      pages: Math.ceil(totalTasks / limit),
      hasNext: page * limit < totalTasks,
      hasPrev: page > 1
    };

    res.status(StatusCodes.OK).json({ tasks, pagination });
  } catch (err) {
    return next(err);
  }
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
        isCompleted: value.isCompleted ?? false,
        priority: value.priority ?? "medium",
        userId: req.user.id
      },
      select: { id: true, title: true, isCompleted: true, priority: true, createdAt: true }
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
        userId: req.user.id,
        trash: false,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        User: {
          select: { name: true, email: true }
        }
      }
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
      where: { id, userId: req.user.id, trash: false },
      select: { id: true, title: true, isCompleted: true, priority: true, createdAt: true }
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
    const task = await prisma.task.update({
      where: { id, userId: req.user.id, trash: false },
      data: { trash: true },
      select: { id: true, title: true, isCompleted: true, priority: true, createdAt: true }
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

const bulkCreate = async (req, res, next) => {
  const { tasks } = req.body;
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Invalid request data. Expected an array of tasks."
    });
  }
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || 'medium',
      userId: req.user.id
    });
  }
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false
    });
    res.status(StatusCodes.CREATED).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length
    });
  } catch (err) {
    return next(err);
  }
};

const getTrashed = async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id, trash: true },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });
    if (tasks.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No trashed tasks found." });
    }
    res.status(StatusCodes.OK).json({ tasks });
  } catch (err) {
    return next(err);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const result = await prisma.task.deleteMany({
      where: { userId: req.user.id, trash: true }
    });
    res.status(StatusCodes.OK).json({ message: `${result.count} task(s) permanently deleted.` });
  } catch (err) {
    return next(err);
  }
};

const restoreTask = async (req, res, next) => {
  const id = parseInt(req.params.id);
  try {
    const task = await prisma.task.update({
      where: { id, userId: req.user.id, trash: true },
      data: { trash: false },
      select: { id: true, title: true, isCompleted: true, priority: true, createdAt: true }
    });
    res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "The task was not found in trash." });
    } else {
      return next(err);
    }
  }
};

module.exports = { index, create, show, update, deleteTask, bulkCreate, getTrashed, emptyTrash, restoreTask };