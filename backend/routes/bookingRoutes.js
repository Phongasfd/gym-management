const express = require('express');
const router = express.Router();
const { getAllBookings, getBookingById, getBookingByUserId, createBooking, updateBooking, cancelBooking, deleteBooking } = require('../controllers/bookingControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Class bookings
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
// GET    /api/bookings
router.get('/', authMiddleware, getAllBookings);

// GET    /api/bookings/me
/**
 * @swagger
 * /api/bookings/me:
 *   get:
 *     summary: Get bookings of current user
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/me', authMiddleware, getBookingByUserId);

// GET    /api/bookings/:id
/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get a specific booking
 *     tags: [Bookings]
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
router.get('/:id', authMiddleware, staffMiddleware, getBookingById);


// POST   /api/bookings 
/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a booking
 *     tags: [Bookings]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authMiddleware, createBooking);


// PATCH  /api/bookings/:id  
/**
 * @swagger
 * /api/bookings/{id}:
 *   patch:
 *     summary: Update a booking
 *     tags: [Bookings]
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
router.patch('/:id', authMiddleware, updateBooking);

// POST   /api/bookings/:id/cancel
/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     tags: [Bookings]
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
 *         description: Booking cancelled successfully
 */
router.post('/:id/cancel', authMiddleware, cancelBooking);

// DELETE /api/bookings/:id (admin only)
/**
 * @swagger
 * /api/bookings/{id}:
 *   delete:
 *     summary: Delete a booking (admin only)
 *     tags: [Bookings]
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
 *         description: Booking deleted successfully
 */
router.delete('/:id', authMiddleware, staffMiddleware, deleteBooking);


module.exports = router;