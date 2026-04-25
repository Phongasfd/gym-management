const express = require('express');
const router = express.Router();
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');
const { updatePassword } = require('../controllers/staffControllers');

/**
 * @swagger
 * tags:
 *   name: Staff
 *   description: Staff endpoints
 */

/**
 * @swagger
 * /api/staff/update-password:
 *   patch:
 *     summary: Update staff password
 *     tags: [Staff]
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
 */

router.patch('/update-password', authMiddleware, staffMiddleware, updatePassword); 


module.exports = router