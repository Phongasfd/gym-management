// /api/vnpay is not mounted when NODE_ENV=test, so the IPN handler is called directly
const mockVerifyIpnCall = jest.fn();

jest.mock("vnpay", () => ({
  VNPay: jest.fn().mockImplementation(() => ({
    verifyIpnCall: mockVerifyIpnCall,
  })),
  ignoreLogger: jest.fn(),
  ProductCode: { Other: "other" },
  VnpLocale: { VN: "vn" },
  dateFormat: jest.fn(),
}));

jest.mock("../../prismaClient", () => ({
  subscription: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
}));

const { Prisma } = require("@prisma/client");
const prisma = require("../../prismaClient");
const { vnPayIPN } = require("../../controllers/vnpayControllers");

const SUBSCRIPTION_ID = "11111111-2222-3333-4444-555555555555";
const TXN_REF = SUBSCRIPTION_ID.replace(/-/g, "");

function callIpn(query) {
  return new Promise((resolve, reject) => {
    vnPayIPN({ query }, { json: resolve }, reject);
  });
}

describe("VNPay IPN", () => {
  beforeEach(() => {
    prisma.subscription.findUnique.mockResolvedValue({
      id: SUBSCRIPTION_ID,
      status: "pending",
      // Prisma returns Decimal for price columns
      package: { price: new Prisma.Decimal(500000), duration_days: 30 },
    });
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("activates the subscription when the paid amount matches the Decimal price", async () => {
    // VNPay sends the amount x100; the library hands it back divided by 100
    const query = { vnp_TxnRef: TXN_REF, vnp_ResponseCode: "00", vnp_Amount: "50000000" };
    mockVerifyIpnCall.mockReturnValue({ ...query, vnp_Amount: 500000, isVerified: true, isSuccess: true });

    const body = await callIpn(query);

    expect(body.RspCode).toBe("00");
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SUBSCRIPTION_ID, status: "pending" },
        data: expect.objectContaining({ status: "active" }),
      })
    );
  });

  test("rejects a payment for the wrong amount", async () => {
    const query = { vnp_TxnRef: TXN_REF, vnp_ResponseCode: "00", vnp_Amount: "100" };
    mockVerifyIpnCall.mockReturnValue({ ...query, vnp_Amount: 1, isVerified: true, isSuccess: true });

    const body = await callIpn(query);

    expect(body.RspCode).toBe("04");
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  test("rejects an invalid signature", async () => {
    mockVerifyIpnCall.mockReturnValue({ isVerified: false });

    const body = await callIpn({ vnp_TxnRef: TXN_REF });

    expect(body.RspCode).toBe("97");
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });
});
