const express = require('express');
const router = express.Router();
const {createMember, getAllMembers, getMemberById, updateMemberById, deleteMemberById} = require('../controllers/memberControllers');
const {authMiddleware, staffMiddleware} = require('../middleware/authMiddleware');


