const express = require('express');
const router = express.Router();
const {authMiddleware, staffMiddleware} = require('../middleware/authMiddleware');
const {createSubscription, getSubscriptions, updateSubscription, getSubscriptionById, getSubscriptionByUserId} = require('../controllers/subscriptionControllers');

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription endpoints
 */

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get all subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 *   post:
 *     summary: Create a subscription
 *     tags: [Subscriptions]
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
 * /api/subscriptions/me:
 *   get:
 *     summary: Get current user subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 * /api/subscriptions/{id}:
 *   get:
 *     summary: Get a subscription by ID
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *   patch:
 *     summary: Update a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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

// GET    /api/subscriptions       
router.get('/', authMiddleware, staffMiddleware, getSubscriptions);

// GET    /api/subscriptions/me  
router.get('/me', authMiddleware, getSubscriptionByUserId);

// GET    /api/subscriptions/:id    
router.get('/:id', authMiddleware, staffMiddleware, getSubscriptionById);

// POST   /api/subscriptions       
router.post('/', authMiddleware, staffMiddleware, createSubscription);

// PATCH  /api/subscriptions/:id 
router.patch('/:id', authMiddleware, staffMiddleware, updateSubscription);

module.exports = router;
