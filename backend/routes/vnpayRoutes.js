const express = require('express');
const router = express.Router();
const {authMiddleware, staffMiddleware} = require('../middleware/authMiddleware');
const {vnPay, vnPayCheck} = require('../controllers/vnpayControllers');

router.post('/create-qr', vnPay); 
router.get('/check-payment-vnpay', vnPayCheck);


module.exports = router;