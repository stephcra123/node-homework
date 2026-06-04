# Assignment 9 — Tests
 
## 1. How do you write effective unit tests for validation schemas and business logic?
 
The validation tests live in `test/validation.test.js` and test the Joi schemas directly — no server, no database, just the schema logic itself.
 
**Test structure** — three `describe` blocks, one per schema: user, task, and patchTask. Each `it` block has exactly one `expect()` so the test report clearly identifies which specific rule failed. Tests are numbered to match the TDD checker.
 
**Testing invalid inputs** — for required fields and format rules, I pass a bad object and check that `error.details` contains a detail with the right `context.key`:
 
```javascript
it("2. The user schema requires that an email be specified.", () => {
  const { error } = userSchema.validate(
    { name: "Bob", password: "Pa$$word1" },
    { abortEarly: false }
  );
  expect(
    error.details.find((detail) => detail.context.key === "email")
  ).toBeDefined();
});
```
 
**Testing valid inputs** — test 7 passes a fully valid object and checks that `error` comes back falsy, confirming the schema accepts correct data without throwing.
 
**Walking through a specific test** — test 1 passes `"password"` as the password value. The schema requires uppercase, lowercase, a number, and a special character, so it should fail. The test checks that `error.details` contains an entry where `context.key` is `"password"`. If the schema is broken and accepts the bad password, `error` is undefined and the test crashes with a clear message.
 
**Edge cases** — test 6 uses a 2-character name to hit the minimum length boundary. Test 9 passes `"maybe"` as an invalid boolean. Test 10 omits `isCompleted` entirely and checks Joi's default of `false` is applied. Test 12 verifies `patchTaskSchema` doesn't require `title`, which `taskSchema` does.
 
---
 
## 2. How do you test Express API endpoints with supertest?
 
The API tests live in `test/user.function.test.js` and make real HTTP requests against the actual running app.
 
**Setup** — a supertest `agent` is used instead of plain `request` because the agent automatically carries cookies between requests, which is essential for JWT cookie-based auth. The app and server are imported from `app.js`:
 
```javascript
agent = request.agent(app);
```
 
The server is closed in `afterAll` to prevent zombie processes.
 
**HTTP methods and status codes** — register hits `POST /api/users/register` expecting 201. Logon hits `POST /api/users/logon` expecting 200. The tasks route hits `GET /api/tasks` expecting not-401 when logged in and 401 after logoff.
 
**Testing authentication and protected routes** — after logon, the CSRF token from the response body is captured and sent as `X-CSRF-TOKEN` on the logoff request, since logoff is a protected POST route. The agent carries the JWT cookie automatically so no manual cookie handling is needed:
 
```javascript
saveRes = await agent
  .post("/api/users/logoff")
  .set("X-CSRF-TOKEN", token);
```
 
**Request/response data validation** — tests 47 and 48 check that the register response contains the expected `name` and a `csrfToken`. Test 52 completes the full cycle: register → logon → confirm access → logoff → confirm 401.
 
---
 
## 3. What testing strategies help ensure comprehensive coverage?
 
**Three types of tests:**
 
- **Unit tests** (`validation.test.js`) — test schemas in isolation, no I/O, very fast
- **Controller tests** (`taskController.test.js`, `user.controller.test.js`) — test controller functions directly using `node-mocks-http`, hitting a real test database but no HTTP layer
- **API tests** (`user.function.test.js`) — test the full stack end to end with supertest
**Organization** — each file has a `beforeAll` that clears and seeds the test database, and an `afterAll` that disconnects Prisma. Tests share state through module-level variables (`saveRes`, `saveData`, `saveTaskId`) so later tests build on earlier ones without re-sending requests.
 
**Running and interpreting results** — `npm run lesson9TDD` runs the TDD checker which validates tests against both correct and intentionally broken mock implementations. A test that passes against the real schema but fails against the broken mock is working correctly. `npx jest --testPathPatterns=test/ --verbose` runs against real code.
 
**Error scenarios and security** — test 14 confirms a missing `req.user` causes a `TypeError`. Test 15 confirms a bogus user ID causes a `PrismaClientKnownRequestError`. Tests 25 and 27 confirm user2 cannot access user1's tasks. Tests 61–63 test the JWT middleware directly: missing cookie → 401, invalid signature → 401, mismatched CSRF token → 401. These security tests are just as important as the happy path tests.