const express = require('express');
const router = express.Router();
const { getAllClasses, getTodayClassesStats, getClassMembers, getClasById, createClass, updateClass, deleteClass } = require('../controllers/classControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Class management endpoints
 */

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Get all classes
 *     tags: [Classes]
 *     responses:
 *       200:
 *         description: Success
 *   post:
 *     summary: Create a new class
 *     tags: [Classes]
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
 * /api/classes/today:
 *   get:
 *     summary: Get today's classes stats
 *     tags: [Classes]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 * /api/classes/{id}/members:
 *   get:
 *     summary: Get members of a class
 *     tags: [Classes]
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
 * /api/classes/{id}:
 *   get:
 *     summary: Get a class by ID
 *     tags: [Classes]
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
 *     summary: Update a class
 *     tags: [Classes]
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
 *   delete:
 *     summary: Delete a class
 *     tags: [Classes]
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
 */

// GET    /api/classes
router.get('/', getAllClasses);

router.get('/today', authMiddleware, getTodayClassesStats);

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
