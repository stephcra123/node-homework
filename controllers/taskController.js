const { StatusCodes } = require('http-status-codes');
const { taskSchema, patchTaskSchema } = require('../validation/taskSchema');
const pool = require("../db/pg-pool");

//const taskCounter = (() => {
//  let lastTaskNumber = 0;
//  return () => {
//    lastTaskNumber += 1;
//    return lastTaskNumber;
//  };
//})();

const index = async (req, res) => {
  const tasks = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
    [global.user_id]
  );
  if (tasks.rows.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No tasks found" });
  }
  res.status(StatusCodes.OK).json(tasks.rows);
};

const create = async (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  const isCompleted = value.is_completed ?? false;
  const task = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id) 
     VALUES ($1, $2, $3) RETURNING id, title, is_completed`,
    [value.title, isCompleted, global.user_id]
  );
  res.status(StatusCodes.CREATED).json(task.rows[0]);
};

const show = async (req, res) => {
  const task = await pool.query(
    `SELECT id, title, is_completed FROM tasks WHERE id = $1 AND user_id = $2`,
    [req.params.id, global.user_id]
  );
  if (task.rows.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
  }
  res.status(StatusCodes.OK).json(task.rows[0]);
};

const update = async (req, res) => {
  if (!req.body) req.body = {};
  if (Object.keys(req.body).length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "No attributes to change were specified." });
  }
  const { error, value: taskChange } = patchTaskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
  let keys = Object.keys(taskChange);
  keys = keys.map((key) => key === "isCompleted" ? "is_completed" : key);
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;
  const updatedTask = await pool.query(
    `UPDATE tasks SET ${setClauses} WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
    [...Object.values(taskChange), req.params.id, global.user_id]
  );
  if (updatedTask.rows.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
  }
  res.status(StatusCodes.OK).json(updatedTask.rows[0]);
};

const deleteTask = async (req, res) => {
  const deletedTask = await pool.query(
    `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title, is_completed`,
    [req.params.id, global.user_id]
  );
  if (deletedTask.rows.length === 0) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "That task was not found" });
  }
  res.status(StatusCodes.OK).json(deletedTask.rows[0]);
};

module.exports = { index, create, show, update, deleteTask };