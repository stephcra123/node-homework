# Authentication & Security
 
## 1. How do you implement secure authentication with JWT tokens?
 
### JWT Token Generation and Signing
 
When a user registers or logs on, the server generates a JWT using the `jsonwebtoken` library. The token is signed with a secret stored in `.env` as `JWT_SECRET`, never hardcoded in the source. The payload contains three things: the user's database ID, a CSRF token (a random UUID), and an expiration of 1 hour.
 
```js
const payload = { id: user.id, csrfToken: randomUUID() };
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
```
 
The token is then set as an `HttpOnly` cookie so JavaScript in the browser cannot read it:
 
```js
res.cookie("jwt", token, { httpOnly: true, secure: true, sameSite: "Strict", maxAge: 3600000 });
```
 
The CSRF token is also returned in the response body so the front end can store it and send it back in headers on write operations.
 
### JWT Middleware
 
The `jwtMiddleware.js` file protects routes by:
 
1. Checking that the `jwt` cookie is present, returns 401 if missing
2. Verifying the token signature and expiry using `jwt.verify()', returns 401 if invalid or expired
3. For write operations (POST, PATCH, PUT, DELETE), comparing the `X-CSRF-TOKEN` header against the token stored inside the JWT, returns 401 if they don't match
4. If all checks pass, storing `req.user = { id: decoded.id }` so downstream handlers know who the user is, then calling `next()`
```js
jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return send401(res);
    req.user = { id: decoded.id };
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
        if (req.get("X-CSRF-TOKEN") != decoded.csrfToken) return send401(res);
    }
    next();
});
```
 
### Protecting Routes
 
Routes are protected by passing `jwtMiddleware` before the route handler in `app.js`:
 
```js
app.use("/api/tasks", jwtMiddleware, taskRouter);
app.use("/api/analytics", jwtMiddleware, analyticsRouter);
```
 
The logoff route is also protected so a CSRF attack can't force a user to be logged out. Inside controllers, `req.user.id` is used instead of a global variable, so each request is scoped to the authenticated user.
 
---
 
## 2. What security vulnerabilities does your authentication system prevent?
 
### CSRF Protection
 
Cross-Site Request Forgery (CSRF) is when a malicious website tricks a user's browser into making a request to your API using the user's cookies. Since cookies are sent automatically, a naive implementation would execute the request.
 
This implementation prevents CSRF by requiring a matching `X-CSRF-TOKEN` header on all write operations. A malicious site can trigger the browser to send the cookie, but it cannot read the CSRF token from the response body (blocked by the browser's same-origin policy), so it cannot set the correct header. The server compares the header value against the value stored inside the JWT, if they don't match, the request is rejected with a 401.
 
### HttpOnly Cookies vs localStorage
 
Storing JWTs in `localStorage` is vulnerable to XSS attacks, any injected JavaScript can read `localStorage` and steal the token. By storing the JWT in an `HttpOnly` cookie, JavaScript in the browser has no access to it at all. The cookie is sent automatically by the browser on each request, but it cannot be read or modified by scripts.
 
The cookie is also set with `sameSite: "Strict"`, which prevents it from being sent on cross-origin requests at all, adding another layer of CSRF protection.
 
### Rate Limiting and Input Sanitization
 
Rate limiting is applied globally using `express-rate-limit`, capping each IP at 100 requests per 15 minutes. This prevents brute-force attacks against the login endpoint.
 
`helmet` is applied to set secure HTTP headers, preventing clickjacking, sniffing attacks, and other common header-based vulnerabilities.
 
Password storage uses `scrypt` with a random salt, so even if the database is compromised, passwords cannot be reversed or compared across users. Timing-safe comparison (`crypto.timingSafeEqual`) prevents timing attacks on password verification.
 
---
 
## 3. How do you handle user sessions and maintain security across requests?
 
### Storing User Information in the JWT Payload
 
The JWT payload stores the minimum necessary information, just the user's database ID and the CSRF token. It does not store roles, email, or other data that could become stale. The expiry is set to 1 hour. On every protected request, the middleware decodes the JWT and attaches `req.user = { id: decoded.id }`, giving the request handler the user's identity without a database lookup.
 
### Authentication vs Authorization
 
**Authentication** is handled by the JWT middleware, it verifies that the request comes from a valid, logged-in user and sets `req.user`.
 
**Authorization** is handled inside the route controllers, for example, a task update checks that the task's `userId` matches `req.user.id`, so a user cannot modify another user's tasks:
 
```js
await prisma.task.update({
    where: { id, userId: req.user.id }, // user can only update their own tasks
    data: value
});
```
 
This separation means authentication is handled once centrally, while authorization logic lives close to the data it protects.
 
### Logout and Token Invalidation
 
Logout clears the JWT cookie on the server side:
 
```js
res.clearCookie("jwt", cookieFlags(req));
```
 
The cookie flags must match exactly what was used when setting the cookie, otherwise the browser won't clear it (particularly important when deployed with `secure: true`). Since JWTs are stateless, there is no server-side session to invalidate — the token simply becomes inaccessible to the browser once the cookie is cleared.
 
### Authentication Errors and Edge Cases
 
The middleware handles three distinct 401 cases:
- **Missing cookie**: user is not logged in or the cookie was cleared
- **Invalid or expired JWT**: token has been tampered with or the 1-hour window has passed
- **CSRF token mismatch**: write request is missing or has an incorrect `X-CSRF-TOKEN` header
All three return the same generic `{ message: "No user is authenticated." }` response: giving no information to an attacker about which check failed. Errors from any individual file operation bubble up to the global error handler rather than crashing the server.