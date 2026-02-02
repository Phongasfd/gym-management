const express = require('express');
const router = express.Router();
const { getAllClasses, getClasById, createClass, updateClass, deleteClass } = require('../controllers/classControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

