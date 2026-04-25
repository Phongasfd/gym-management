const express = require('express');
const router = express.Router();
const {authMiddleware} = require('../middleware/authMiddleware');
const {vnPay, vnPayReturn, vnPayIPN} = require('../controllers/vnpayControllers');

/**
 * @swagger
 * tags:
 *   name: VNPay
 *   description: VNPay integration endpoints
 */

/**
 * @swagger
 * /api/vnpay/create-qr:
 *   post:
 *     summary: Create VNPay payment URL/QR
 *     tags: [VNPay]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Success
 * /api/vnpay/check-payment-vnpay:
 *   get:
 *     summary: VNPay return callback URL
 *     tags: [VNPay]
 *     responses:
 *       200:
 *         description: Success
 * /api/vnpay/vnpay-ipn:
 *   get:
 *     summary: VNPay IPN webhook
 *     tags: [VNPay]
 *     responses:
 *       200:
 *         description: Success
 */

router.post('/create-qr', authMiddleware, vnPay); 
router.get('/check-payment-vnpay', vnPayReturn);
router.get('/vnpay-ipn', vnPayIPN); // server-to-server call vnpay 


module.exports = router; 