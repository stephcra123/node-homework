# Node.js Fundamentals

## What is Node.js?
It is a free, open-source, cross-platform JavaScript runtime environment that allows developers to execute JavaScript code outside of a web browse

## How does Node.js differ from running JavaScript in the browser?
JavaScript was originally created to run inside the browser, to make web applications rich and responsive.
But because browser JavaScript runs in a sandbox, a protected area, it's blocked from doing things like accessing your local file system or opening server-side sockets. Node.js changed which is a version of JavaScript that runs locally on any machine instead of in the browser, with no sandbox. 



## What is the V8 engine, and how does Node use it?
V8 is Google's JavaScript engine, and Node uses it to run JavaScript outside the browser. 

## What are some key use cases for Node.js?
Node is great for web application servers, file system operations, networking, and anything that benefits from non-blocking I/O. It's also used for command-line tools and real-time applications. 

## Explain the difference between CommonJS and ES Modules. Give a code example of each.
The main difference between CommonJS (CJS) and ES Modules (ESM) lies in their syntax, loading mechanisms, and environment compatibility. ES Modules are now the official language standard. 

**CommonJS (default in Node.js):**
```js Synchronous: Blocks execution until the module is loaded. Runtime: Imports can be conditional or dynamic.
// const { register, logoff } = require ()
// module.exports = { add, multiply }
```

**ES Modules (supported in modern Node.js):**
```js Asynchronous: Analyzes the module graph before execution. Compile-time: Imports are static and must be at the top level.
// import { useState, useEffect } from 'react';
//export function add(a, b) { return a + b; }
``` 