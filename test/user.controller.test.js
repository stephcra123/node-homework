require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { EventEmitter } = require("events");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const { register, logoff, logon } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

let saveRes = null;
let saveData = null;
let jwtCookie;

function MockResponseWithCookies() {
  const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
  res.cookie = (name, value, options = {}) => {
    const serializeOptions = {
      ...options,
      httpOnly: options.httpOnly === true,
    };
    const serialized = cookie.serialize(name, String(value), serializeOptions);
    let currentHeader = res.getHeader("Set-Cookie") || [];
    currentHeader.push(serialized);
    res.setHeader("Set-Cookie", currentHeader);
  };
  res.clearCookie = (name, options = {}) => {
    const serialized = cookie.serialize(name, "", { ...options, expires: new Date(0) });
    let currentHeader = res.getHeader("Set-Cookie") || [];
    currentHeader.push(serialized);
    res.setHeader("Set-Cookie", currentHeader);
  };
  return res;
}

beforeAll(async () => {
  await prisma.Task.deleteMany();
  await prisma.User.deleteMany();
});

afterAll(() => {
  prisma.$disconnect();
});

describe("testing logon, register, and logoff", () => {
  it("33. A user can be registered.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { name: "Bob", email: "bob@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(register, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });

  it("34. The user can logon.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "bob@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("35. A string in the cookie array starts with 'jwt='.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toBeDefined();
  });

  it("36. That string contains 'HttpOnly;'.", () => {
    expect(jwtCookie).toContain("HttpOnly");
  });

  it("37. The returned data from the register has the expected name.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.name).toBe("Bob");
  });

  it("38. The returned data contains a csrfToken.", () => {
    expect(saveData.csrfToken).toBeDefined();
  });

  it("39. You can now logoff.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    req.user = { id: 1 };
    const csrfToken = saveData.csrfToken;
    req.cookies = { jwt: jwtCookie.split("=")[1].split(";")[0] };
    if (!req.headers) req.headers = {};
    req.headers["x-csrf-token"] = csrfToken;
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logoff, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
    req.secure = false;
req.headers = req.headers || {};
  });

  it("40. The logoff clears the cookie.", () => {
    const setCookieArray = saveRes.get("Set-Cookie");
    jwtCookie = setCookieArray.find((str) => str.startsWith("jwt="));
    expect(jwtCookie).toContain("Jan 1970");
  });

  it("41. A logon attempt with a bad password returns a 401.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { email: "bob@sample.com", password: "wrongpassword" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(logon, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("42. You can't register with an email address that is already registered.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { name: "Bob", email: "bob@sample.com", password: "Pa$$word20" },
    });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(register, req, saveRes);
    expect(saveRes.statusCode).toBe(400);
  });
});

describe("Testing JWT middleware", () => {
  it("61. jwtMiddleware Returns a 401 if the JWT cookie is not present in the req.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    saveRes = MockResponseWithCookies();
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("62. Returns a 401 if the JWT is invalid", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    const badCookie = jwt.sign({ id: 5, csrfToken: "badToken" }, "badSecret", { expiresIn: "1h" });
    req.cookies = { jwt: badCookie };
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("63. Returns a 401 if the JWT is valid but the CSRF token isn't.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    const goodCookie = jwt.sign({ id: 5, csrfToken: "badToken" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    req.cookies = { jwt: goodCookie };
    if (!req.headers) req.headers = {};
    req.headers["x-csrf-token"] = "goodtoken";
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(saveRes.statusCode).toBe(401);
  });

  it("64. Calls next() if both the token and the jwt are good.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    const goodCookie = jwt.sign({ id: 5, csrfToken: "goodtoken" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    req.cookies = { jwt: goodCookie };
    if (!req.headers) req.headers = {};
    req.headers["x-csrf-token"] = "goodtoken";
    const next = await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(next).toHaveBeenCalled();
  });

  it("65. If both the token and the jwt are good, req.user.id has the appropriate value.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    saveRes = MockResponseWithCookies();
    const goodCookie = jwt.sign({ id: 5, csrfToken: "goodtoken" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    req.cookies = { jwt: goodCookie };
    if (!req.headers) req.headers = {};
    req.headers["x-csrf-token"] = "goodtoken";
    await waitForRouteHandlerCompletion(jwtMiddleware, req, saveRes);
    expect(req.user.id).toBe(5);
  });
});