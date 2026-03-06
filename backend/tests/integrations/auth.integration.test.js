const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../app");
const prisma = require("../../prisma");

describe("Auth API - Integration", () => {
  beforeAll(async () => {
    // ensure clean state 
    await prisma.user.deleteMany();

    // create user
    const hashedPassword = await bcrypt.hash("Namphong2006@", 10);

    await prisma.user.create({
      data: {
        email: "nguyennamphong210@gmail.com",
        password_hash: hashedPassword,
        full_name: "Nam Phong",
        role: "staff",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("POST /api/auth/staff-login - success", async () => {
    const res = await request(app)
      .post("/api/auth/staff-login")
      .send({
        email: "nguyennamphong210@gmail.com",
        password: "Namphong2006@",
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
