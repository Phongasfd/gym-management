const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Get all bookings
const getAllBookings = catchAsync(async (req, res) => {
  
    const bookings = await prisma.booking.findMany();
    res.status(200).json(bookings);
    

});

// Get booking by ID
const getBookingById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: id }
    });
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    res.status(200).json(booking);
    
});

// Get booking by ID
const getBookingByUserId = catchAsync(async (req, res) => {
    const id = req.user.userId;

    const booking = await prisma.booking.findMany({
      where: { member_id: id }
    });
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    res.status(200).json(booking);
    
});

// Member booking
const createBooking = catchAsync(async (req, res) => {
    const { class_id, status } = req.body;
    const member_id = req.user.userId; 
    const newBooking = await prisma.booking.create({
      data: {
        member_id,
        class_id,
        status
      }
    });
    res.status(201).json(newBooking);
});

// Update booking by ID
const updateBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { class_id, member_id, status } = req.body;
    const updatedBooking = await prisma.booking.update({
      where: { id: id },
      data: { 
        class_id,
        member_id,
        status 
      }
    });
    res.status(200).json(updatedBooking);


});

module.exports = {
  getAllBookings,
  getBookingById,
  getBookingByUserId,
  createBooking,
  updateBooking
};

