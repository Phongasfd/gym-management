const request = require("supertest");
const app = require("../app");

describe("Auth API", () => {
  test("POST /api/auth/staff-login", async () => {
    const res = await request(app)
      .post("/api/auth/staff-login")
      .send({
        email: "nguyennamphong210@gmail.com",
        password: "Namphong2006@",
      });

    expect(res.statusCode).toBe(200);
  });
});