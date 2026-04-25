const express = require('express');
const router = express.Router();
const {createPackage, getAllPackages, getPackageById, updatePackage, deletePackage} = require('../controllers/packageControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware'); 

/**
 * @swagger
 * tags:
 *   name: Packages
 *   description: Package management endpoints
 */

/**
 * @swagger
 * /api/packages:
 *   get:
 *     summary: Get all packages
 *     tags: [Packages]
 *     responses:
 *       200:
 *         description: Success
 *   post:
 *     summary: Create a package
 *     tags: [Packages]
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
 * /api/packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Packages]
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
 *     summary: Update a package
 *     tags: [Packages]
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
 *     summary: Delete a package
 *     tags: [Packages]
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

