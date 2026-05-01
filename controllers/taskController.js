const { StatusCodes } = require('http-status-codes');

const index = (req, res) => {
  res.json({ message: 'index route works!' });
};

const create = (req, res) => {
  res.json({ message: 'create route works!' });
};

const show = (req, res) => {
  res.json({ message: 'show route works!' });
};

const update = (req, res) => {
  res.json({ message: 'update route works!' });
};

const deleteTask = (req, res) => {
  res.json({ message: 'deleteTask route works!' });
};

module.exports = { index, create, show, update, deleteTask };