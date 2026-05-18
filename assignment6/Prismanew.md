# Database Integration with Node.js, PostgreSQL, and Prisma
 
## How do you connect Node.js to PostgreSQL and what are the benefits over in-memory storage?
 
### In-memory storage like `global.users` and `global.tasks` disappears every time the server restarts. Nobody wants to re-register every time you deploy. A real database persists data, supports multiple users at once, and enforces data integrity through constraints.
 
The database connection is set up in `db/prisma.js`:
 
```javascript
const { PrismaClient } = require("@prisma/client");
 
const prisma = new PrismaClient({ log: ["query"] });
 
module.exports = prisma;
```
 
Prisma uses connection pooling instead of opening a new database connection for every request (which is slow and expensive), it maintains a pool of reusable connections. When a request comes in, it grabs an available connection, uses it, and returns it to the pool. This is critical for handling multiple users at the same time without overwhelming the database.
 
The schema defines two tables with a foreign key relationship:
 
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(30) NOT NULL,
  hashed_password VARCHAR(255) NOT NULL
);
 
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  user_id INTEGER NOT NULL REFERENCES users(id)
);
```
 
The `user_id` foreign key in `tasks` references `users(id)`: this means you can never create a task for a user that doesn't exist, and the database enforces this automatically.
 
---
 
## What is an ORM and how does Prisma improve database operations?
 
### An ORM (Object Relational Mapper) lets you interact with your database using JavaScript instead of raw SQL. Prisma is a ORM.
 
The Prisma schema defines models that map directly to database tables:
 
```prisma
model User {
  id             Int      @id @default(autoincrement())
  email          String   @unique
  name           String
  hashedPassword String
  tasks          Task[]
}
 
model Task {
  id          Int     @id @default(autoincrement())
  title       String
  isCompleted Boolean @default(false)
  userId      Int
  user        User    @relation(fields: [userId], references: [id])
 
  @@unique([id, userId])
}
```
 
The difference between raw SQL and Prisma is readability and safety. Here's the same operation both ways:
 
**Raw SQL with pg:**
```javascript
const result = await pool.query(
  "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
  [global.user_id]
);
```
 
**Prisma:**
```javascript
const tasks = await prisma.task.findMany({
  where: { userId: global.user_id },
  select: { id: true, title: true, isCompleted: true }
});
```
 
Prisma is safer because your editor autocompletes field names and catches typos at development time — not at runtime when a user hits the bug. The `select` option lets you choose exactly which fields to return, so you never accidentally expose `hashedPassword` or `userId`.
 
---
 
## How do you transform raw SQL queries to Prisma operations?
 
### Let's walk through creating a user. In raw SQL you manually build the INSERT and handle the duplicate email error using PostgreSQL's error code `23505`. With Prisma you use `prisma.user.create()` and catch error code `P2002` instead.
 
**Raw SQL version:**
```javascript
try {
  const result = await pool.query(
    `INSERT INTO users (email, name, hashed_password)
     VALUES ($1, $2, $3) RETURNING id, email, name`,
    [email, name, hashedPassword]
  );
} catch (e) {
  if (e.code === "23505") {
    return res.status(400).json({ message: "Email already registered" });
  }
}
```
 
**Prisma version:**
```javascript
try {
  const user = await prisma.user.create({
    data: { name, email, hashedPassword },
    select: { name: true, email: true, id: true }
  });
} catch (err) {
  if (err.code === "P2002") {
    return res.status(400).json({ message: "Email already registered" });
  }
}
```
 
For update and delete, Prisma throws `P2025` when no matching record is found, with raw SQL you'd just get an empty array back and have to check the length yourself. Prisma makes the "not found" case explicit, which leads to cleaner error handling.
 
The `@@unique([id, userId])` constraint in the Task model is what allows Prisma to do `update()` and `delete()` filtering on both `id` and `userId` at the same time, without that composite unique index, Prisma wouldn't allow it.