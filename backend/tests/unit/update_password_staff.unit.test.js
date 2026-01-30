process.env.JWT_SECRET = "test_secret";

jest.mock("../../prisma", () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const request = require("supertest");
const app = require("../../app");         
const prisma = require("../../prisma");
const bcrypt = require("bcryptjs");

// Mock auth middleware to always assign req.user
jest.mock("../../middleware/authMiddleware", () => {
  return {
    authMiddleware: (req, res, next) => {
      req.user = { staffId: "user-123", userType: "staff" };
      next();
    },
    staffMiddleware: (req, res, next) => {
      next();
    }
  };
});

describe("PATCH /api/staff/update-password - Unit Test", () => {

  afterEach(() => {
    jest.clearAllMocks();
  }); // clear previous mock result, times called after each test 

  // Missing required fields
  test("400 - Missing required fields", async () => {
    const res = await request(app)
      .patch("/api/staff/update-password")
      .send({
        currentPassword: "",
        newPassword: "",
        confirm: "",
      });

    expect(res.statusCode).toBe(400);
  });

  // Passwords do not match
  test("400 - Passwords do not match", async () => {
    const res = await request(app)
      .patch("/api/staff/update-password")
      .send({
        currentPassword: "oldpass",
        newPassword: "newpass1",
        confirm: "newpass2",
      });

    expect(res.statusCode).toBe(400);
  });

  // User not found
  test("404 - User not found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/staff/update-password")
      .send({
        currentPassword: "oldpass",
        newPassword: "newpass",
        confirm: "newpass",
      });

    expect(prisma.user.findUnique).toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  // Current password incorrect
  test("400 - Current password is incorrect", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      password_hash: "hashed_old",
    });

    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .patch("/api/staff/update-password")
      .send({
        currentPassword: "wrongpass",
        newPassword: "newpass",
        confirm: "newpass",
      });

    expect(bcrypt.compare).toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });

  // Success case
  test("200 - Update password successfully", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-123",
      password_hash: "hashed_old",
    });

    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("hashed_new");

    prisma.user.update.mockResolvedValue({});

    const res = await request(app)
      .patch("/api/staff/update-password")
      .send({
        currentPassword: "oldpass",
        newPassword: "newpass",
        confirm: "newpass",
      });

    expect(bcrypt.compare).toHaveBeenCalledWith("oldpass", "hashed_old");
    expect(bcrypt.hash).toHaveBeenCalledWith("newpass", 10);
    expect(prisma.user.update).toHaveBeenCalled();

    expect(res.statusCode).toBe(200);
  });

  // Server error
  test("500 - Server error", async () => {
    prisma.user.findUnique.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .patch("/api/staff/update-password")
      .send({
        currentPassword: "oldpass",
        newPassword: "newpass",
        confirm: "newpass",
      });

    expect(res.statusCode).toBe(500);
  });

});