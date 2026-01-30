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
  });
});
