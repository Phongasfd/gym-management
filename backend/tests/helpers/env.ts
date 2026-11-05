// Runs before every test file (jest setupFiles), before any app module is imported.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test_secret';
process.env.VNP_TMN_CODE ??= 'TESTCODE';
process.env.VNP_HASH_SECRET ??= 'test_vnpay_secret';
process.env.VNP_URL ??= 'https://sandbox.vnpayment.vn';
process.env.VNP_RETURN_URL ??= 'http://localhost:3000/api/vnpay/check-payment-vnpay';
