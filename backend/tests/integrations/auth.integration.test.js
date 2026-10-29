const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../app");
const prisma = require("../../prismaClient");
const { csrfAgent } = require("../helpers/csrf");

describe("Auth API - Integration", () => {
  beforeAll(async () => {
    // ensure clean state 
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // create user
    const hashedPassword = await bcrypt.hash("Password123@", 10);

    await prisma.user.create({
      data: {
        email: "staff@example.com",
        password_hash: hashedPassword,
        full_name: "Test Staff",
        role: "staff",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("POST /api/auth/staff-login - success", async () => {
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

    // verify cookies are set
    const cookies = res.headers['set-cookie'];
    expect(cookies.some(c=>c.startsWith('access_token'))).toBe(true);
    expect(cookies.some(c=>c.startsWith('refresh_token'))).toBe(true);

    // perform refresh using the received cookie
    const refreshRes = await request(app)
      .get("/api/auth/refresh-token")
      .set('Cookie', cookies);

    expect(refreshRes.statusCode).toBe(200);
    const cookies2 = refreshRes.headers['set-cookie'];
    expect(cookies2.some(c=>c.startsWith('access_token'))).toBe(true);
    expect(cookies2.some(c=>c.startsWith('refresh_token'))).toBe(true);
  });
});
