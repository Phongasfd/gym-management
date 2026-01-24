process.env.JWT_SECRET = "test_secret";

const request = require("supertest");
const app = require("../app");
const prisma = require("../src/prisma");
const bcrypt = require("bcrypt");

describe("Auth API", () => {
  test("POST /api/auth/staff-login - success", async () => {
    // Fake user trong DB
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: "nguyennamphong210@gmail.com",
      password_hash: "hashed_password",
      full_name: "Nam Phong",
      role: "staff",
    });

    // Fake bcrypt so sánh đúng
    bcrypt.compare.mockResolvedValue(true);

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