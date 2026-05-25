# Advanced Prisma Features — Video Notes
 
## How do you use Prisma's advanced querying features for analytics and reporting?
 
### Prisma goes beyond basic CRUD with powerful aggregation tools that let you build analytics without writing raw SQL for most cases.
 
`groupBy` lets you count or aggregate records by a specific field. In the analytics controller, we use it to count tasks by completion status:
 
```javascript
const taskStats = await prisma.task.groupBy({
  by: ['isCompleted'],
  where: { userId },
  _count: { id: true }
});
```
 
This returns something like `[{ isCompleted: false, _count: { id: 5 } }, { isCompleted: true, _count: { id: 12 } }]`: telling you how many tasks are done vs pending for a user, in one query.
 
`_count` works inside `findMany` too. In the users list endpoint we count each user's tasks without a separate query:
 
```javascript
const users = await prisma.user.findMany({
  include: {
    _count: { select: { Task: true } }
  }
});
```
 
Eager loading with `include` or `select` fetches related data in the same query. In the task index we include the user's name and email alongside each task:
 
```javascript
const tasks = await prisma.task.findMany({
  where: { userId: global.user_id },
  select: {
    id: true, title: true, isCompleted: true, priority: true,
    User: { select: { name: true, email: true } }
  }
});
```
 
This eliminates the N+1 problem, instead of querying the user for each task separately, everything comes back in one database call.
 
---
 
## What are database transactions and how do you implement them with Prisma?
 
### A transaction groups multiple database operations so they either all succeed or all fail together. Without transactions, you could end up with a user created but their welcome tasks missing — leaving the database in an inconsistent state.
 
In the register endpoint we wrap user creation and welcome task creation in a single transaction:
 
```javascript
const result = await prisma.$transaction(async (tx) => {
  const newUser = await tx.user.create({
    data: { email, name, hashedPassword },
    select: { id: true, email: true, name: true }
  });
 
  await tx.task.createMany({
    data: [
      { title: "Complete your profile", userId: newUser.id, priority: "medium" },
      { title: "Add your first task", userId: newUser.id, priority: "high" },
      { title: "Explore the app", userId: newUser.id, priority: "low" }
    ]
  });
 
  return { user: newUser };
});
```
 
If `createMany` throws, say the database goes down mid-operation, Prisma automatically rolls back the user creation too. The database stays clean with no orphaned records.
 
`createMany` is the bulk insert tool. Instead of looping and calling `create()` three times (three round trips to the database), `createMany` sends all records in one operation — much faster for large datasets.
 
---
 
## When and how do you use raw SQL with Prisma's `$queryRaw`?
 
### Prisma covers most queries, but some things it can't express — like relevance-ranked text search. That's when `$queryRaw` steps in.
 
The task search endpoint needs to rank results by how closely they match, exact matches first, then prefix matches, then contains. Prisma's `contains` filter can't express that ordering, so we use raw SQL:
 
```javascript
const searchPattern = `%${searchQuery}%`;
const exactMatch = searchQuery;
const startsWith = `${searchQuery}%`;
 
const results = await prisma.$queryRaw`
  SELECT t.id, t.title, t.is_completed as "isCompleted",
         t.priority, u.name as "user_name"
  FROM tasks t
  JOIN users u ON t.user_id = u.id
  WHERE t.title ILIKE ${searchPattern}
  ORDER BY 
    CASE 
      WHEN t.title ILIKE ${exactMatch} THEN 1
      WHEN t.title ILIKE ${startsWith} THEN 2
      ELSE 3
    END
  LIMIT ${limit}
`;
```
 
The template literal syntax is critical — Prisma parameterizes every `${}` value automatically, so user input never gets concatenated into the SQL string. This prevents SQL injection completely.
 
The difference between `$queryRaw` and `$queryRawUnsafe` is exactly this — `$queryRaw` with template literals is always parameterized and safe. `$queryRawUnsafe` accepts a plain string where you could accidentally concatenate user input, making it dangerous. Never use `$queryRawUnsafe` with user-provided values.