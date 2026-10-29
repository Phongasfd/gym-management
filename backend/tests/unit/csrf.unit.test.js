process.env.JWT_SECRET = "test_secret";

jest.mock("../../prismaClient", () => ({
  user: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
  },
}));

const request = require("supertest");
const app = require("../../app");
const prisma = require("../../prismaClient");
const { csrfAgent } = require("../helpers/csrf");

// Any state-changing request goes through the CSRF middleware before the route,
// so an unknown user (404/401 from the controller) proves the request got past CSRF.
const LOGIN = "/api/auth/staff-login";
const BODY = { email: "nobody@example.com", password: "x" };

describe("CSRF protection (csrf-csrf)", () => {
  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("accepts a POST with the token and its cookie", async () => {
    const { agent, csrfToken } = await csrfAgent(app);

    const res = await agent.post(LOGIN).set("X-CSRF-Token", csrfToken).send(BODY);

    expect(res.statusCode).toBe(401); // reached the controller: invalid credentials
  });

  test("rejects a POST without a token", async () => {
    const { agent } = await csrfAgent(app);

    const res = await agent.post(LOGIN).send(BODY);

    expect(res.statusCode).toBe(403);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("rejects a tampered token", async () => {
    const { agent, csrfToken } = await csrfAgent(app);

    const res = await agent.post(LOGIN).set("X-CSRF-Token", csrfToken.slice(0, -2) + "00").send(BODY);

    expect(res.statusCode).toBe(403);
  });

  test("rejects a token without its cookie (what a cross-site attacker has)", async () => {
    const { csrfToken } = await csrfAgent(app);

    const res = await request(app).post(LOGIN).set("X-CSRF-Token", csrfToken).send(BODY);

    expect(res.statusCode).toBe(403);
  });

  test("rejects another browser's token", async () => {
    const victim = await csrfAgent(app);
    const attacker = await csrfAgent(app);

    const res = await victim.agent.post(LOGIN).set("X-CSRF-Token", attacker.csrfToken).send(BODY);

    expect(res.statusCode).toBe(403);
  });

  test("returns the same token while the cookie is kept (frontends cache it)", async () => {
    const { agent, csrfToken } = await csrfAgent(app);

    const again = await agent.get("/api/auth/csrf-token");

    expect(again.body.csrfToken).toBe(csrfToken);
  });

  test("the token cookie is httpOnly", async () => {
    const res = await request(app).get("/api/auth/csrf-token");

    const cookie = res.headers["set-cookie"].find((c) => c.startsWith("gym.x-csrf-token="));
    expect(cookie).toMatch(/HttpOnly/i);
  });
});
