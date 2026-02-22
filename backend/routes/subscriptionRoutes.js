const express = require('express');
const router = express.Router();
const {authMiddleware, staffMiddleware} = require('../middleware/authMiddleware');
const {createSubscription, getSubscriptions, updateSubscription, getSubscriptionById, getSubscriptionByUserId} = require('../controllers/subscriptionControllers');

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
