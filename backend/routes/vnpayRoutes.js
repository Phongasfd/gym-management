const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middleware/authMiddleware');
const {vnPay, vnPayReturn, vnPayIPN} = require('../controllers/vnpayControllers');

router.post('/create-qr', authMiddleware, vnPay); 
router.get('/check-payment-vnpay', vnPayReturn);
router.get('/vnpay-ipn', vnPayIPN); // server-to-server call vnpay 


module.exports = router; 