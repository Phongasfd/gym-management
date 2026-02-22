const prisma = require('../prisma');

// Get all bookings
const getAllBookings = async (req, res) => {
  try {
    
    const bookings = await prisma.booking.findMany();
    res.status(200).json(bookings);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: id }
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.status(200).json(booking);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get booking by ID
const getBookingByUserId = async (req, res) => {
  try {
    const id = req.user.userId;

    const booking = await prisma.booking.findMany({
      where: { member_id: id }
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.status(200).json(booking);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Member booking
const createBooking = async (req, res) => {
  try {
    const { class_id, member_id, status } = req.body;
    const newBooking = await prisma.booking.create({
      data: {
        member_id,
        class_id,
        status
      }
    });
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update booking by ID
const updateBooking = async (req, res) => {
  try {
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

  }catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  getBookingByUserId,
  createBooking,
  updateBooking
};

