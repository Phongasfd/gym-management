const express = require('express');
const router = express.Router();
const { getAllBookings, getBookingById, createBooking, updateBooking } = require('../controllers/bookingControllers');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

// GET    /api/bookings
router.get('/', authMiddleware, staffMiddleware, getAllBookings);

// GET    /api/bookings/:id
router.get('/:id', authMiddleware, staffMiddleware, getBookingById);


// POST   /api/bookings 
router.post('/', authMiddleware, createBooking);


// PATCH  /api/bookings/:id  
router.get('/:id', authMiddleware, staffMiddleware, updateBooking);


module.exports = router;