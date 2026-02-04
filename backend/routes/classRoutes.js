const express = require('express');
const router = express.Router();
const { getAllClasses, getTodayClassesStats, getClasById, createClass, updateClass, deleteClass } = require('../controllers/classControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

// GET    /api/classes
router.get('/', authMiddleware, getAllClasses);

router.get('/today', authMiddleware, getTodayClassesStats);

// GET    /api/classes/:id
router.get('/:id', authMiddleware, getClasById);

// POST   /api/classes
router.post('/', authMiddleware, staffMiddleware, createClass);

// PATCH  /api/classes/:id
router.patch('/:id', authMiddleware, staffMiddleware, updateClass);

// DELETE /api/classes/:id
router.delete('/:id', authMiddleware, staffMiddleware, deleteClass);

module.exports = router;
