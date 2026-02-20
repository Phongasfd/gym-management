const express = require('express');
const router = express.Router();
const { getAllClasses, getTodayClassesStats, getClassMembers, getClasById, createClass, updateClass, deleteClass } = require('../controllers/classControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

// GET    /api/classes
router.get('/', authMiddleware, getAllClasses);

router.get('/today', getTodayClassesStats);

router.get('/:id/members', authMiddleware, staffMiddleware, getClassMembers);

// GET    /api/classes/:id
router.get('/:id', authMiddleware, getClasById);

// POST   /api/classes
router.post('/', authMiddleware, staffMiddleware, createClass);

// PATCH  /api/classes/:id
router.patch('/:id', authMiddleware, staffMiddleware, updateClass);

// DELETE /api/classes/:id
router.delete('/:id', authMiddleware, staffMiddleware, deleteClass);

module.exports = router;
