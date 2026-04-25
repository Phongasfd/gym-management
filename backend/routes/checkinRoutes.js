const express = require('express');
const router = express.Router();
const { getAllCheckins, createCheckin } = require('../controllers/checkinControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Checkins
 *   description: Member check-in endpoints
 */

/**
 * @swagger
 * /api/checkins:
 *   get:
 *     summary: Get all checkins
 *     tags: [Checkins]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 *   post:
 *     summary: Create a new checkin
 *     tags: [Checkins]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
// GET    /api/checkins   
router.get('/', authMiddleware, staffMiddleware, getAllCheckins);                

// POST   /api/checkins                  
router.post('/', authMiddleware, staffMiddleware, createCheckin);

module.exports = router;