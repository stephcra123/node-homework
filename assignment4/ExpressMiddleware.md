# Task Validations

## How do you protect routes using middleware in Express?
 
### Protected routes are routes that require a user to be authenticated before they can access them. Without protection, anyone could read, create, update, or delete data that doesn't belong to them. In our app, task routes are protected — if you're not logged in, you get a 401 immediately and never reach the route handler.
Authentication middleware is a function that runs before the route handler and checks whether a valid user session exists. If not, it sends back a 401 and stops the request there. If the user is logged in, it calls next() and lets the request continue.
 
```javascript
// middleware/auth.js
module.exports = (req, res, next) => {
  if (!global.user_id) {
    return res.status(401).json({ message: "unauthorized" });
  }
  next();
};
```
---
 To apply it to specific routes only, you pass it as an argument before the router:
```javascript
app.use("/api/tasks", authMiddleware, taskRouter); // protected
app.use("/api/users", userRouter);                 // public

```
Public routes like /api/users/register and /api/users/logon must stay unprotected — otherwise no one could ever log in. The key distinction is: public routes are ones anyone can call, protected routes are ones only authenticated users can reach.

## What security vulnerabilities does data validation prevent and how do you implement it?
 
Without validation, users can send anything in a request body — malicious scripts, oversized payloads, or malformed data that crashes your server. Validation prevents two major attack categories:
SQL Injection — attackers send SQL code in form fields hoping the server runs it against the database. Validating that fields are the right type and format stops unexpected input from reaching your queries.
XSS (Cross-Site Scripting) — attackers inject JavaScript into fields that gets stored and later rendered in a browser. Trimming and validating string inputs reduces this risk.

We use Joi for validation. Here's what each rule does:
 
```javascript
// userSchema.js
const userSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  // trim removes whitespace, lowercase normalizes it, email checks format

  name: Joi.string().trim().min(3).max(30).required(),
  // min/max prevent empty or oversized values

  password: Joi.string().trim().min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/)
    .required(),
  // pattern enforces complexity — uppercase, lowercase, number, special char
});
```
```javascript
// taskSchema.js
const taskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).required(),
  isCompleted: Joi.boolean().default(false).not(null),
  // default(false) means if not provided, it's set automatically
});

const patchTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(30).not(null),
  isCompleted: Joi.boolean().not(null),
}).min(1).message("No attributes to change were specified.");
// min(1) means at least one field must be present — no empty patches
```
---
## Why should you never store passwords in plain text and what are the security principles for password hashing?
 
If your database is ever compromised and passwords are stored in plain text, every user's password is immediately exposed. This is especially dangerous because most people reuse passwords across multiple sites, one breach can compromise their email, bank, and everything else. You also face serious legal and reputational consequences.
Why hashing alone isn't enough, rainbow table attacks
A hash is a one-way function that converts a password into a fixed string. The problem is that common passwords like "password123" always produce the same hash. Attackers precompute a massive lookup table of hashes for common passwords, called a rainbow table, and can instantly reverse any hash that appears in it.
Salt solves this - A salt is a random string generated uniquely for each user and combined with their password before hashing. Even if two users have the same password, their hashes will be completely different because their salts differ. This makes rainbow table attacks useless since the attacker would need a separate table for every possible salt.
Cryptography is extraordinarily difficult to get right. Algorithms that look secure often have subtle weaknesses that only experts can spot. Always use well-vetted algorithms like scrypt, bcrypt, or argon2. We use scrypt because bcrypt has known weaknesses and is considered outdated. The implementation looks like this:
 
```javascript
// async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex"); // unique per user
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;      // store both together


async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");           // retrieve the salt
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey); // constant-time compare
}
``` 
---
 Hashing vs Encryption: Encryption is two-way — you can decrypt it if you have the key. Hashing is one-way — there is no way to reverse it. Passwords should always be hashed, never encrypted. If passwords were encrypted, anyone who obtained the encryption key could decrypt every password in your database. With hashing, even if someone gets your database, they can't recover the original passwords.
