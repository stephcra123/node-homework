# Node.js Fundamentals 2

## How do Event Emitters and Listeners work in Node.js??
Event Emitters in Node.js allow different parts of an application to communicate through events. The EventEmitter class is built into Node.js and lets you define custom events and listeners.
A listener is registered using .on(), and it waits for a specific event to be emitted. When .emit() is called, all listeners for that event are triggered.
Event emission in Node.js is synchronous, meaning once an event is emitted, all listeners run immediately before moving on to the next line of code.

## What are the key differences between Node's HTTP module and Express.js?
Node’s HTTP module is the built-in way to create a web server, but it is very low-level and requires manually handling routes, requests, and responses. Express.js is built on top of Node’s HTTP module and simplifies development by providing:

-Easy routing (GET, POST, etc.)
-Middleware support
-Cleaner request and response handling
-Built-in tools for parsing JSON and URL data

Middleware is a function that runs between the request and response cycle. It can modify requests, log data, or pass control using next(). Routing in Express allows us to define endpoints like /home or /testpost and handle them separately.

## How do you handle different HTTP methods and routes in a web server??
HTTP methods define the type of action being performed:

GET → retrieve data
POST → send/create data
PUT → replace an entire resource
PATCH → update part of a resource
DELETE → remove a resource

In Express, each method has its own handler:
```js
//app.get()
app.post()
app.put()
app.patch()
app.delete()
```
Request bodies can be parsed using:
app.use(express.json());
Headers and query parameters can be accessed using:

req.headers
req.query
req.body

Responses are sent using res.send() or res.json().
Error handling is done using middleware. You can return status codes like:

200 → OK
201 → Created
404 → Not Found
500 → Server Error
