process.env.JWT_SECRET = "test_secret";

const mockTx = {
  booking: {
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  class: {
    findUnique: jest.fn(),
  },
};

jest.mock("../../prismaClient", () => ({
  booking: {
    findMany: jest.fn(),
  },
  // run the callback against the mocked client, like a real interactive transaction
  $transaction: jest.fn((fn) => fn(mockTx)),
}));

// Each test picks who is calling; the real staffMiddleware stays so role checks are exercised
let mockCurrentUser;
jest.mock("../../middleware/authMiddleware", () => {
  const actual = jest.requireActual("../../middleware/authMiddleware");
  return {
    ...actual,
    authMiddleware: (req, res, next) => {
      req.user = mockCurrentUser;
      next();
    },
  };
});

const { Prisma } = require("@prisma/client");
const app = require("../../app");
const prisma = require("../../prismaClient");
const { csrfAgent } = require("../helpers/csrf");

const MEMBER = { userType: "member", userId: "member-1" };
const STAFF = { userType: "staff", staffId: "staff-1", role: "staff" };
const CLASS = { id: "class-1", name: "Yoga", capacity: 2 };

async function postBooking(body) {
  const { agent, csrfToken } = await csrfAgent(app);
  return agent.post("/api/bookings").set("X-CSRF-Token", csrfToken).send(body);
}

describe("Bookings API", () => {
  beforeEach(() => {
    mockCurrentUser = MEMBER;
    mockTx.class.findUnique.mockResolvedValue(CLASS);
    mockTx.booking.findUnique.mockResolvedValue(null);
    mockTx.booking.count.mockResolvedValue(0);
    mockTx.booking.create.mockImplementation(({ data }) => Promise.resolve({ id: "booking-1", ...data }));
    mockTx.booking.update.mockImplementation(({ data }) => Promise.resolve({ id: "booking-old", ...data }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/bookings - creates an active booking in a serializable transaction", async () => {
    const res = await postBooking({ class_id: "class-1" });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("active");
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" })
    );
  });

  test("POST /api/bookings - ignores a client-supplied status", async () => {
    const res = await postBooking({ class_id: "class-1", status: "vip" });

    expect(res.statusCode).toBe(201);
    expect(mockTx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) })
    );
  });

  test("POST /api/bookings - capacity only counts bookings that are not cancelled", async () => {
    await postBooking({ class_id: "class-1" });

    expect(mockTx.booking.count).toHaveBeenCalledWith({
      where: { class_id: "class-1", status: { not: "cancelled" } },
    });
  });

  test("POST /api/bookings - 400 when the class is full", async () => {
    mockTx.booking.count.mockResolvedValue(CLASS.capacity);

    const res = await postBooking({ class_id: "class-1" });

    expect(res.statusCode).toBe(400);
    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });

  test("POST /api/bookings - 400 when already booked", async () => {
    mockTx.booking.findUnique.mockResolvedValue({ id: "booking-old", status: "active" });

    const res = await postBooking({ class_id: "class-1" });

    expect(res.statusCode).toBe(400);
  });

  test("POST /api/bookings - re-activates a cancelled booking instead of hitting the unique constraint", async () => {
    mockTx.booking.findUnique.mockResolvedValue({ id: "booking-old", status: "cancelled" });

    const res = await postBooking({ class_id: "class-1" });

    expect(res.statusCode).toBe(201);
    expect(mockTx.booking.create).not.toHaveBeenCalled();
    expect(mockTx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "booking-old" }, data: { status: "active" } })
    );
  });

  test("POST /api/bookings - retries when the serializable transaction conflicts (P2034)", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("write conflict", {
      code: "P2034",
      clientVersion: "test",
    });
    prisma.$transaction
      .mockImplementationOnce(() => Promise.reject(conflict))
      .mockImplementationOnce((fn) => fn(mockTx));

    const res = await postBooking({ class_id: "class-1" });

    expect(res.statusCode).toBe(201);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  test("POST /api/bookings - 400 without class_id", async () => {
    const res = await postBooking({});

    expect(res.statusCode).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("GET /api/bookings - members cannot list every booking", async () => {
    const { agent } = await csrfAgent(app);
    const res = await agent.get("/api/bookings");

    expect(res.statusCode).toBe(403);
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });

  test("GET /api/bookings - staff can list bookings", async () => {
    mockCurrentUser = STAFF;
    prisma.booking.findMany.mockResolvedValue([]);
    const { agent } = await csrfAgent(app);

    const res = await agent.get("/api/bookings");

    expect(res.statusCode).toBe(200);
  });

  test("PATCH /api/bookings/:id - members cannot change booking status", async () => {
    const { agent, csrfToken } = await csrfAgent(app);
    const res = await agent
      .patch("/api/bookings/booking-1")
      .set("X-CSRF-Token", csrfToken)
      .send({ status: "active" });

    expect(res.statusCode).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
