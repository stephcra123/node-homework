require("dotenv").config();
const request = require("supertest");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const prisma = require("../db/prisma");
let agent;
let saveRes;
const { app, server } = require("../app");

beforeAll(async () => {
  await prisma.Task.deleteMany();
  await prisma.User.deleteMany();
  agent = request.agent(app);
});

afterAll(async () => {
  prisma.$disconnect();
  server.close();
});

describe("register a user ", () => {
  let saveRes = null;
  let csrfToken = null;

  it("46. it creates the user entry", async () => {
    const newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };
    saveRes = await agent.post("/api/users/register").send(newUser);
    expect(saveRes.status).toBe(201);
  });

  it("47. Registration returns an object with the expected name.", () => {
    expect(saveRes.body.user.name).toBe("John Deere");
  });

  it("48. The returned object includes a csrfToken.", () => {
    expect(saveRes.body.csrfToken).toBeDefined();
  });

  it("49. You can logon as the newly registered user.", async () => {
    const logonObj = { email: "jdeere@example.com", password: "Pa$$word20" };
    saveRes = await agent.post("/api/users/logon").send(logonObj);
    expect(saveRes.status).toBe(200);
  });

  it("50. See if you are logged in", async () => {
    const res = await agent.get("/api/tasks");
    expect(res.status).not.toBe(401);
  });

  it("51. You can logoff.", async () => {
    const token = saveRes.body.csrfToken;
    expect(token).toBeDefined();
    saveRes = await agent
      .post("/api/users/logoff")
      .set("X-CSRF-TOKEN", token);
    expect(saveRes.status).toBe(200);
  });

  it("52. Makes sure we are logged out", async () => {
    const res = await agent.get("/api/tasks");
    expect(res.status).toBe(401);
  });
});