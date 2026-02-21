const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay'); 

const vnPay = async (req, res) => {

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
    vnp_Amount: 50000,
    vnp_IpAddr: req.ip,
    vnp_TxnRef: Date.now().toString(), 
    vnp_OrderInfo: '123456',
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: process.env.VNP_RETURN_URL,
    vnp_IpnUrl: process.env.VNP_IPN_URL,
    vnp_Locale: VnpLocale.VN,
    vnp_CreateDate: dateFormat(new Date()),
    vnp_ExpireDate: dateFormat(tomorrow),
  });

  return res.status(201).json(vnpayResponse); 
};

const vnPayCheck = async (req, res) => {
  const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMN_CODE,
    secureSecret: process.env.VNP_HASH_SECRET,
    hashAlgorithm: 'SHA512',
  });

  const verify = vnpay.verifyReturnUrl(req.query);

  if (!verify.isVerified) {
    return res.status(400).json({ message: 'Invalid signature' });
  }  // verify signature 

  console.log(req.query);
}; // redirect to successful payment page 

const vnPayIpn = async (req, res) => {
  const vnpay = new VNPay({
    tmnCode: process.env.VNP_TMN_CODE,
    secureSecret: process.env.VNP_HASH_SECRET,
    hashAlgorithm: 'SHA512',
  });

  const verify = vnpay.verifyReturnUrl(req.query);

  if (!verify.isVerified) {
    return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
  }

  const { vnp_TxnRef, vnp_ResponseCode, vnp_Amount } = req.query;

  // 1. tìm order trong DB
  // 2. check amount có khớp không
  // 3. nếu chưa PAID thì update
  // 4. trả về { RspCode: '00', Message: 'Confirm Success' }

  return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
}; // update database 


module.exports = {
  vnPay,
  vnPayCheck,
  vnPayIpn
};