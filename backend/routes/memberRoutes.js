const express = require('express');
const router = express.Router();
const {createMember, getAllMembers, getMembersOverview, getMemberById, updateMemberById} = require('../controllers/memberControllers');
const {authMiddleware, staffMiddleware} = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Members
 *   description: Member management endpoints
 */

/**
 * @swagger
 * /api/members:
 *   get:
 *     summary: Get all members
 *     tags: [Members]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 *   post:
 *     summary: Create a new member
 *     tags: [Members]
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
 * /api/members/overview:
 *   get:
 *     summary: Get members overview
 *     tags: [Members]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 * /api/members/{id}:
 *   get:
 *     summary: Get member by ID
 *     tags: [Members]
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
 *   put:
 *     summary: Update member
 *     tags: [Members]
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


// GET    /api/members   
router.get('/', authMiddleware, staffMiddleware, getAllMembers);

router.get('/overview', authMiddleware, staffMiddleware, getMembersOverview);

// GET    /api/members/:id   
router.get('/:id', authMiddleware, staffMiddleware, getMemberById);


// POST   /api/members
router.post('/', authMiddleware, staffMiddleware, createMember);

// PUT    /api/members/:id
router.put('/:id', authMiddleware, staffMiddleware, updateMemberById);

module.exports = router;