global.user_id = null;
global.users = [];
global.tasks = [];

const express = require("express");
const app = express();

const notFoundMiddleware = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");
const userRouter = require("./routes/userRoutes");
const authMiddleware = require("./middleware/auth");
const taskRouter = require("./routes/taskRoutes");

app.use(express.json({ limit: "1kb" }));

app.use((req, res, next) => {
  console.log("----------------------");
  console.log("Method:", req.method);
  console.log("Path:", req.path);
  console.log("Query:", req.query);
  console.log("----------------------");
  next();
});

app.get("/", (req, res) => {
    res.json({ message: "Hello, World!" });
});

app.use("/api/users", userRouter);
app.use("/api/tasks", authMiddleware, taskRouter);

app.use(notFoundMiddleware);
app.use(errorHandler);

const port = process.env.PORT || 3000;
const server = app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`),
    );

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

let isShuttingDown = false;
async function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('Shutting down gracefully...');
  try {
    await new Promise(resolve => server.close(resolve));
    console.log('HTTP server closed.');
    // If you have DB connections, close them here
  } catch (err) {
    console.error('Error during shutdown:', err);
    code = 1;
  } finally {
    console.log('Exiting process...');
    process.exit(code);
  }
}

process.on('SIGINT', () => shutdown(0));  // ctrl+c
process.on('SIGTERM', () => shutdown(0)); // e.g. `docker stop`
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  shutdown(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  shutdown(1);
});    

module.exports = { app, server} ;