const express = require('express');
const router = express.Router();
const {authMiddleware, staffMiddleware} = require('../middleware/authMiddleware');
const {vnPay, vnPayCheck} = require('../controllers/vnpayControllers');

router.post('/create-qr', authMiddleware, vnPay); 
router.get('/check-payment-vnpay', authMiddleware, vnPayCheck);


module.exports = router;