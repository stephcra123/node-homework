# Express Middleware

## What are the parameters always passed to a route handler? What are they for?
 
### A route handler always receives `req` and `res`. The `req` object contains everything about the incoming request — the method, path, query parameters, headers, cookies, and body. The `res` object has methods like `res.json()` and `res.send()` that let the handler send a response back to the caller.
 
```javascript
app.get("/dogs", (req, res) => {
  console.log(req.method);   // "GET"
  console.log(req.path);     // "/dogs"
  console.log(req.query);    // { breed: "labrador" } from /dogs?breed=labrador
  console.log(req.body);     // parsed JSON body (POST requests)
  res.json({ message: "success" });
});
```
 
---
 
## What must a route handler always do?
 
### A route handler must always do one of three things: send a response using `res.json()`, call the error handler using `next(error)`, or throw an error. If none of these happen, the request will hang until it times out.
 
```javascript
// Option 1: send a response
app.get("/dogs", (req, res) => {
  res.status(200).json({ dogs: [] });
});
 
// Option 2: pass an error to the error handler
app.post("/adopt", (req, res, next) => {
  try {
    // something that might fail
  } catch (err) {
    next(err);
  }
});
 
// Option 3: throw an error
app.get("/error", (req, res) => {
  throw new Error("Something went wrong");
});
```
 
---
 
## How does a middleware function differ from a route handler?
 
### A route handler must always send a response. A middleware function doesn't have to — instead it can call `next()` to pass control to the next function in the chain. Middleware is meant to process or modify the request before it reaches the route handler.
 
```javascript
// Middleware — modifies req and calls next()
app.use((req, res, next) => {
  req.requestId = "abc123";  // adds data to req
  next();                    // passes control forward, no response sent
});
 
// Route handler — must send a response
app.get("/dogs", (req, res) => {
  console.log(req.requestId); // "abc123" — set by middleware above
  res.json({ dogs: [] });     // response is required
});
```
 
---
 
## If you do an `await` in a route handler, who has to wait?
 
### Only the caller who made that specific request has to wait — for example, while the server waits on a database response. Other incoming requests are not blocked and continue to be dispatched as normal.
 
```javascript
app.get("/dogs", async (req, res) => {
  const dogs = await db.find();  // this caller waits for the DB
  res.json(dogs);                // response sent once DB replies
  // other requests to /dogs or any route are still handled normally
});
```
 
---
 
## How do the filter conditions for `app.use()` and `app.get()` differ?
 
### `app.use()` takes an optional path prefix and matches any HTTP method whose path starts with that prefix. `app.get()` requires an exact path match and only matches GET requests. In short, `app.use()` is broader while `app.get()` is more specific.
 
```javascript
// app.use() — matches ANY method starting with /api
app.use("/api", (req, res, next) => {
  console.log("hits for GET /api/dogs, POST /api/adopt, etc.");
  next();
});
 
// app.get() — matches ONLY GET requests to exactly /dogs
app.get("/dogs", (req, res) => {
  res.json({ dogs: [] });
});
 
// you can also chain middleware directly on a route
app.get("/dogs", authMiddleware, validateMiddleware, (req, res) => {
  res.json({ dogs: [] });
});
```