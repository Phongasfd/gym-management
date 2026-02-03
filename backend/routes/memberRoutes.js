const express = require('express');
const router = express.Router();
const {createMember, getAllMembers, getMemberById, updateMemberById} = require('../controllers/memberControllers');
const {authMiddleware, staffMiddleware} = require('../middleware/authMiddleware');


// GET    /api/members   
router.get('/', authMiddleware, staffMiddleware, getAllMembers);

// GET    /api/members/:id   
router.get('/:id', authMiddleware, staffMiddleware, getMemberById);

// POST   /api/members
router.post('/', authMiddleware, staffMiddleware, createMember);

// PUT    /api/members/:id
router.put('/:id', authMiddleware, staffMiddleware, updateMemberById);

module.exports = router;