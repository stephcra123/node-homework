const { StatusCodes } = require('http-status-codes');
const { taskSchema, patchTaskSchema } = require('../validation/taskSchema');

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

const index = (req, res) => {
  const userTasks = global.tasks.filter(t => t.userId === global.user_id.email);
  if (!userTasks.length) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found" });
  }
  const sanitizedTasks = userTasks.map((task) => {
    const { userId, ...sanitizedTask } = task;
    return sanitizedTask;
  });
  res.status(StatusCodes.OK).json(sanitizedTasks);
};

const create = (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  const newTask = { ...value, id: taskCounter(), userId: global.user_id.email };
  global.tasks.push(newTask);
  const { userId, ...sanitizedTask } = newTask;
  res.status(StatusCodes.CREATED).json(sanitizedTask);
};

const show = (req, res) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }
  const task = global.tasks.find(t => t.id === taskToFind && t.userId === global.user_id.email);
  if (!task) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
  }
  const { userId, ...sanitizedTask } = task;
  res.status(StatusCodes.OK).json(sanitizedTask);
};

const update = (req, res) => {
  if (!req.body) req.body = {};
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }
  const { error, value } = patchTaskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  const currentTask = global.tasks.find(t => t.id === taskToFind && t.userId === global.user_id.email);
  if (!currentTask) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
  }
  Object.assign(currentTask, value);
  const { userId, ...sanitizedTask } = currentTask;
  res.status(StatusCodes.OK).json(sanitizedTask);
};

const deleteTask = (req, res) => {
  const taskToFind = parseInt(req.params?.id);
  if (!taskToFind) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "The task ID passed is not valid." });
  }
  const taskIndex = global.tasks.findIndex(t => t.id === taskToFind && t.userId === global.user_id.email);
  if (taskIndex === -1) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
  }
  const { userId, ...task } = global.tasks[taskIndex];
  global.tasks.splice(taskIndex, 1);
  return res.status(StatusCodes.OK).json(task);
};

module.exports = { index, create, show, update, deleteTask };