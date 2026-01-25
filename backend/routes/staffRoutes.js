const express = require('express');
const router = express.Router();
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');
const { updatePassword } = require('../controllers/staffControllers');

router.patch('/update-password', authMiddleware, staffMiddleware, updatePassword); 


module.exports = router