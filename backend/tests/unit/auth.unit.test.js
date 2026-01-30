process.env.JWT_SECRET = "test_secret";

jest.mock("../prisma", () => ({
  user: {
    findUnique: jest.fn(),
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
const prisma = require("../../prisma");
const bcrypt = require("bcryptjs");

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