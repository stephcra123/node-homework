const express = require("express");
const router = express.Router();
const { index, create, show, update, deleteTask, bulkCreate } = require("../controllers/taskController");

router.route("/").get(index).post(create);
router.route("/bulk").post(bulkCreate);
router.route("/trash").get(getTrashed).delete(emptyTrash);
router.route("/trash/:id").patch(restoreTask);
router.route("/:id").get(show).patch(update).delete(deleteTask);

module.exports = router;