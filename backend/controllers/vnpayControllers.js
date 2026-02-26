const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay'); 
const prisma = require('../prisma');

function restoreUUID(str) {
  return str.replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    '$1-$2-$3-$4-$5'
  );
}

const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMN_CODE,
  secureSecret: process.env.VNP_HASH_SECRET,
  vnpayHost: process.env.VNP_URL,
  testMode: true,
  hashAlgorithm: 'SHA512',
  loggerFn: ignoreLogger,
});

const vnPay = async (req, res) => {

  const { packageId } = req.body;
  const userId = req.user.userId; 

  const pkg = await prisma.package.findUnique({
    where: { id: packageId }
  });

  if (!pkg) {
    return res.status(404).json({ message: 'Package not found' });
  }

  const subscription = await prisma.subscription.create({
    data: {
      member_id: userId,
      package_id: packageId,
      status: 'pending'
    }
  });


  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1); 
  let ipAddr =
  req.headers['x-forwarded-for']?.split(',')[0] ||
  req.connection?.remoteAddress ||
  req.socket?.remoteAddress ||
  req.ip;

  // localhost ::1 → IPv4
  if (ipAddr === '::1') {
    ipAddr = '127.0.0.1';
  }

  const vnpayResponse = await vnpay.buildPaymentUrl({
    vnp_Amount: pkg.price,
    vnp_IpAddr: ipAddr,
    vnp_TxnRef: `${subscription.id}`.replace(/-/g, ''),
    vnp_OrderInfo: `Thanh toan goi tap`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: process.env.VNP_RETURN_URL,
    vnp_Locale: VnpLocale.VN,
    vnp_CreateDate: dateFormat(new Date()),
    vnp_ExpireDate: dateFormat(tomorrow),
  });

  return res.status(201).json(vnpayResponse); 
};

const vnPayReturn = async (req, res) => {
  // Determine front‑end base URL once (can be overridden via env)
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

  const verify = vnpay.verifyReturnUrl(req.query);

  if (!verify.isVerified) {
    // signature problems are treated as failure
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  }

  if (!verify.isSuccess) {
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  }

  const { vnp_TxnRef, vnp_ResponseCode } = req.query;

  if (!vnp_TxnRef) {
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  }

  if (vnp_ResponseCode !== '00') {
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  }

  const originalId = restoreUUID(vnp_TxnRef);

  const subscription = await prisma.subscription.findUnique({
    where: { id: originalId }
  });

  if (!subscription) {
    return res.redirect(`${FRONTEND_URL}/payment-failed`);
  }

  return res.redirect(`${FRONTEND_URL}/payment-success`);
}; 

const vnPayIPN = async (req, res) => {

  const verify = vnpay.verifyIpnCall(req.query);

  if (!verify.isVerified) {
    return res.json({ RspCode: '97', Message: 'Invalid signature' });
  }

  const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount } = req.query;

  const originalId = restoreUUID(vnp_TxnRef);

  const subscription = await prisma.subscription.findUnique({
    where: { id: originalId },
    include: { package: true }
  });

  if (!subscription) {
    return res.json({ RspCode: '01', Message: 'Subscription not found' });
  }

  if (subscription.status === 'active') {
    return res.json({ RspCode: '02', Message: 'Subscription already confirmed' });
  }

  // Check amount
  if (subscription.package.price !== Number(vnp_Amount)) {
    return res.json({ RspCode: '04', Message: 'Invalid amount' });
  }

  if (vnp_ResponseCode === '00') {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + subscription.package.duration_days * 24 * 60 * 60 * 1000);

    await prisma.subscription.updateMany({
      where: {
        id: subscription.id,
        status: 'pending'
      },
      data: {
        status: 'active',
        start_date: startDate,
        end_date: endDate
      }
    }); 

  } else {
      await prisma.subscription.updateMany({
      where: {
        id: subscription.id,
        status: 'pending'
      },
      data: { status: 'failed' }
    });
  }

  return res.json({ RspCode: '00', Message: 'Confirm Success' });
};

module.exports = {
  vnPay,
  vnPayReturn,
  vnPayIPN
};