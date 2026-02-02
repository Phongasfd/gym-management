const express = require('express');
const router = express.Router();
const {createPackage, getAllPackages, getPackageById, updatePackage, deletePackage} = require('../controllers/packageControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware'); 

