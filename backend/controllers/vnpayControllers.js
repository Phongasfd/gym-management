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

  console.log(req.query);
};


module.exports = {
  vnPay,
  vnPayCheck
};