process.env.JWT_SECRET = "test_secret";

jest.mock("../../prisma", () => ({
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
  beforeEach(() => {
    // default mocks
    jwt.verify = jest.fn();
  });

  test("POST /api/auth/staff-login - success", async () => {
    // Fake user in DB
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
    // should set both cookies
    const cookies = res.headers['set-cookie'];
    expect(cookies.some(c => c.startsWith('access_token'))).toBe(true);
    expect(cookies.some(c => c.startsWith('refresh_token'))).toBe(true);
  });

  test("GET /api/auth/refresh-token - valid token", async () => {
    // make jwt.verify return decoded payload
    jwt.verify.mockReturnValue({ userType: 'staff', staffId: 1, role: 'staff' });

    const res = await request(app)
      .get("/api/auth/refresh-token")
      .set('Cookie', ['refresh_token=valid']);

    expect(res.statusCode).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies.some(c => c.startsWith('access_token'))).toBe(true);
    expect(cookies.some(c => c.startsWith('refresh_token'))).toBe(true);
  });

  test("GET /api/auth/refresh-token - missing token", async () => {
    const res = await request(app).get("/api/auth/refresh-token");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/auth/refresh-token - invalid token", async () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    const res = await request(app)
      .get("/api/auth/refresh-token")
      .set('Cookie', ['refresh_token=bad']);
    expect(res.statusCode).toBe(403);
  });
});