process.env.JWT_SECRET = "test_secret";

jest.mock("../../prismaClient", () => ({
  user: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "fake_token"),
}));

const request = require("supertest");
const app = require("../../app");
const prisma = require("../../prismaClient");
const bcrypt = require("bcryptjs");
const { csrfAgent } = require("../helpers/csrf");

describe("Auth API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/auth/staff-login - success", async () => {
    // Fake user in DB
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: "staff@example.com",
      password_hash: "hashed_password",
      full_name: "Test Staff",
      role: "staff",
    });
    prisma.refreshToken.create.mockResolvedValue({ id: "rt-1" });

    // Fake bcrypt so sánh đúng
    bcrypt.compare.mockResolvedValue(true);

    const { agent, csrfToken } = await csrfAgent(app);
    const res = await agent
      .post("/api/auth/staff-login")
      .set("X-CSRF-Token", csrfToken)
      .send({
        email: "staff@example.com",
        password: "Password123@",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("user");
    // refresh token is stored hashed, never raw
    expect(prisma.refreshToken.create).toHaveBeenCalled();
    // should set both cookies
    const cookies = res.headers['set-cookie'];
    expect(cookies.some(c => c.startsWith('access_token'))).toBe(true);
    expect(cookies.some(c => c.startsWith('refresh_token'))).toBe(true);
  });

  test("POST /api/auth/staff-login - rejected without CSRF token", async () => {
    const res = await request(app)
      .post("/api/auth/staff-login")
      .send({ email: "staff@example.com", password: "Password123@" });

    expect(res.statusCode).toBe(403);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("GET /api/auth/refresh-token - valid token rotates it", async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: "rt-1",
      user_id: 1,
      user_type: "staff",
      revoked: false,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });
    prisma.user.findUnique.mockResolvedValue({ id: 1, role: "staff" });
    prisma.refreshToken.create.mockResolvedValue({ id: "rt-2" });
    prisma.refreshToken.update.mockResolvedValue({});

    const res = await request(app)
      .get("/api/auth/refresh-token")
      .set('Cookie', ['refresh_token=valid']);

    expect(res.statusCode).toBe(200);
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: "rt-1" },
      data: { revoked: true, replaced_by: "rt-2" },
    });
    const cookies = res.headers['set-cookie'];
    expect(cookies.some(c => c.startsWith('access_token'))).toBe(true);
    expect(cookies.some(c => c.startsWith('refresh_token'))).toBe(true);
  });

  test("GET /api/auth/refresh-token - missing token", async () => {
    const res = await request(app).get("/api/auth/refresh-token");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/auth/refresh-token - unknown token", async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .get("/api/auth/refresh-token")
      .set('Cookie', ['refresh_token=bad']);
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/auth/refresh-token - reused (revoked) token revokes all sessions", async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: "rt-1",
      user_id: 1,
      user_type: "staff",
      revoked: true,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await request(app)
      .get("/api/auth/refresh-token")
      .set('Cookie', ['refresh_token=stolen']);

    expect(res.statusCode).toBe(401);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { user_id: 1 },
      data: { revoked: true },
    });
  });
});
