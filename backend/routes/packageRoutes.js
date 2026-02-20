const express = require('express');
const router = express.Router();
const {createPackage, getAllPackages, getPackageById, updatePackage, deletePackage} = require('../controllers/packageControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware'); 

// GET    /api/package
router.get('/', getAllPackages); 

// GET    /api/package/:id
router.get('/:id', authMiddleware, getPackageById);


// POST   /api/package
router.post('/', authMiddleware, staffMiddleware, createPackage);

// patch  /api/package/:id
router.patch('/:id', authMiddleware, staffMiddleware, updatePackage);

// DELETE /api/package/:id
router.delete('/:id', authMiddleware, staffMiddleware, deletePackage);

module.exports = router;

