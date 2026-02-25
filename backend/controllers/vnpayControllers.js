const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay'); 
const prisma = require('../prisma');

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

  const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMN_CODE,
    secureSecret: process.env.VNP_HASH_SECRET,
    vnpayHost: process.env.VNP_URL,
    testMode: true,
    hashAlgorithm: 'SHA512',
    loggerFn: ignoreLogger,
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1); 

  const vnpayResponse = await vnpay.buildPaymentUrl({
    vnp_Amount: pkg.price * 100,
    vnp_IpAddr: req.headers['x-forwarded-for'] || req.ip,
    vnp_TxnRef: subscription.id, 
    vnp_OrderInfo: `Payment for ${pkg.name}`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: process.env.VNP_RETURN_URL,
    vnp_IpnUrl: process.env.VNP_IPN_URL,
    vnp_Locale: VnpLocale.VN,
    vnp_CreateDate: dateFormat(new Date()),
    vnp_ExpireDate: dateFormat(tomorrow),
  });

  return res.status(201).json(vnpayResponse); 
};

const vnPayReturn = async (req, res) => {
  const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMN_CODE,
    secureSecret: process.env.VNP_HASH_SECRET,
    hashAlgorithm: 'SHA512'
  });

  const verify = vnpay.verifyReturnUrl(req.query);

  if (!verify.isVerified) {
    return res.status(400).json({ status: "INVALID_SIGNATURE" });
  }

  const { vnp_TxnRef, vnp_ResponseCode } = req.query;

  if(!vnp_TxnRef){
    return res.status(400).json({ status: "INVALID" });
  }

  if (vnp_ResponseCode !== '00') {
    return res.json({
      status: 'failed',
      message: 'Payment failed'
    });
  }

  const subscription = await prisma.subscription.findUnique({
    where: {id: vnp_TxnRef}
  });

  if(!subscription){
    return res.status(404).json({ status: "NOT_FOUND" });
  }

  return res.json({
    status: subscription.status,
    message: subscription.status === 'active' ? 'Payment successful' : 'Payment pending or failed'
  });
}; 

const vnPayIPN = async (req, res) => {
  const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMN_CODE,
    secureSecret: process.env.VNP_HASH_SECRET,
    hashAlgorithm: 'SHA512'
  });

  const verify = vnpay.verifyIpnUrl(req.query);

  if (!verify.isVerified) {
    return res.json({ RspCode: '97', Message: 'Invalid signature' });
  }

  const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount } = req.query;

  const subscription = await prisma.subscription.findUnique({
    where: { id: vnp_TxnRef },
    include: { package: true }
  });

  if (!subscription) {
    return res.json({ RspCode: '01', Message: 'Subscription not found' });
  }

  if (subscription.status === 'active') {
    return res.json({ RspCode: '02', Message: 'Subscription already confirmed' });
  }

  // Check amount
  if (subscription.package.price * 100 !== Number(vnp_Amount)) {
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
    await prisma.subscription.update({
      where: { id: subscription.id },
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