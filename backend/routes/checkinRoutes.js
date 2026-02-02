const express = require('express');
const router = express.Router();
const { getAllCheckins, createCheckin } = require('../controllers/checkinControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

// GET    /api/checkins   
router.get('/', authMiddleware, staffMiddleware, getAllCheckins);                

// POST   /api/checkins                  
router.post('/', authMiddleware, staffMiddleware, createCheckin);

module.exports = router;