# Relational Databases & SQL

## Relational Database Concepts

A relational database stores data in structured tables made of rows and columns.  
Tables are connected using keys and relationships, allowing data to stay organized, accurate, and easy to query.

### Primary Keys
A primary key uniquely identifies each record in a table.
- Cannot contain duplicates
- Cannot be NULL
- Used to identify rows

```sql
UserID INT PRIMARY KEY
```

### Foreign Keys
A foreign key links one table to another.
- Maintains relationships between tables
- Prevents invalid references
- Enforces referential integrity

```sql
FOREIGN KEY (UserID) REFERENCES Users(UserID)
```

---

# Types of Relationships

## One-to-One
One record relates to exactly one other record.

Example:
- One user → one profile

---

## One-to-Many
One record can relate to many records.

Example:
- One customer → many orders

---

## Many-to-Many
Multiple records relate to multiple records.

Example:
- Students ↔ Courses

This relationship usually requires a junction table.

---

# Constraints

Constraints enforce rules on data to maintain integrity and consistency.

Common constraints:
- PRIMARY KEY
- FOREIGN KEY
- UNIQUE
- NOT NULL
- CHECK

Example:

```sql
Email VARCHAR(255) UNIQUE NOT NULL
```

Benefits:
- Prevent duplicate data
- Ensure valid relationships
- Improve database reliability

---

# Main SQL Operations

## SELECT
Retrieves data from a table.

```sql
SELECT * FROM Users;
```

---

## INSERT
Adds new records.

```sql
INSERT INTO Users (UserID, Name)
VALUES (1, 'Sarah');
```

---

## UPDATE
Modifies existing records.

```sql
UPDATE Users
SET Name = 'Emma'
WHERE UserID = 1;
```

---

## DELETE
Removes records.

```sql
DELETE FROM Users
WHERE UserID = 1;
```

---

# Working with Multiple Tables

## JOIN Operations

JOINs combine related data across tables.

### INNER JOIN

```sql
SELECT Users.Name, Orders.Product
FROM Users
INNER JOIN Orders
ON Users.UserID = Orders.UserID;
```

This returns matching records from both tables.

---

# Aggregation Functions

Aggregation functions summarize data.

Common functions:
- COUNT()
- SUM()
- AVG()
- MAX()
- MIN()

Example:

```sql
SELECT UserID, COUNT(OrderID)
FROM Orders
GROUP BY UserID;
```

This counts the number of orders per user.

---

# GROUP BY

`GROUP BY` organizes rows into groups for aggregation.

Example:

```sql
SELECT Department, AVG(Salary)
FROM Employees
GROUP BY Department;
```

Useful for:
- Reports
- Analytics
- Summaries

---

# WHERE vs HAVING

## WHERE
Filters rows before grouping.

```sql
SELECT * FROM Orders
WHERE Price > 100;
```

---

## HAVING
Filters grouped results after aggregation.

```sql
SELECT UserID, COUNT(OrderID)
FROM Orders
GROUP BY UserID
HAVING COUNT(OrderID) > 5;
```

---

# Example Database Tables

## Users Table

| UserID | Name  | Email            |
|--------|--------|------------------|
| 1      | Sarah | sarah@email.com  |
| 2      | John  | john@email.com   |

---

## Orders Table

| OrderID | UserID | Product |
|---------|--------|----------|
| 101     | 1      | Laptop   |
| 102     | 2      | Phone    |

---

# Final Summary

Relational databases use:
- Tables
- Keys
- Relationships
- Constraints

SQL provides tools to:
- Retrieve data
- Insert records
- Update information
- Delete records
- Combine tables
- Analyze datasets efficiently

Core SQL features include:
- SELECT
- INSERT
- UPDATE
- DELETE
- JOIN
- GROUP BY
- HAVING
