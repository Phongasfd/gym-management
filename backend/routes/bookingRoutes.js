const express = require('express');
const router = express.Router();
const { getAllBookings, getBookingById, getBookingByUserId, createBooking, updateBooking } = require('../controllers/bookingControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

// GET    /api/bookings
router.get('/', authMiddleware, getAllBookings);

// GET    /api/bookings/me
router.get('/me', authMiddleware, getBookingByUserId);

// GET    /api/bookings/:id
router.get('/:id', authMiddleware, staffMiddleware, getBookingById);


// POST   /api/bookings 
router.post('/', authMiddleware, createBooking);


// PATCH  /api/bookings/:id  
router.get('/:id', authMiddleware, staffMiddleware, updateBooking);


module.exports = router;