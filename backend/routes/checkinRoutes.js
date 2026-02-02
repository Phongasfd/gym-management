const express = require('express');
const router = express.Router();
const { getAllCheckins, createCheckin } = require('../controllers/checkinControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

