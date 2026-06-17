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

// Member booking with transaction to prevent double booking
const createBooking = catchAsync(async (req, res) => {
    const { class_id, status } = req.body;
    const member_id = req.user.userId;

    // Use transaction to ensure atomicity and prevent race conditions
    // all queries run like a block, if any query fails, the whole transaction rolls back 
    // tx: transaction client instance, prisma client in transaction scope 
    const newBooking = await prisma.$transaction(async (tx) => {
      // 1. Check if member already has a booking for this class
      const existingBooking = await tx.booking.findUnique({
        where: {
          member_id_class_id: {
            member_id,
            class_id
          }
        }
      });

      if (existingBooking) {
        throw new AppError('Member already booked for this class', 400);
      }

      // 2. Get class details and check capacity
      const classData = await tx.class.findUnique({
        where: { id: class_id }
      });

      if (!classData) {
        throw new AppError('Class not found', 404);
      }

      // 3. Count current bookings for this class
      const bookingCount = await tx.booking.count({
        where: { class_id }
      });

      // 4. Check if class is at capacity
      if (bookingCount >= classData.capacity) {
        throw new AppError('Class is at full capacity', 400);
      }

      // 5. Create booking if all checks pass (within transaction, atomic operation)
      const booking = await tx.booking.create({
        data: {
          member_id,
          class_id,
          status: status || 'confirmed'
        },
        include: {
          member: {
            select: { id: true, email: true, full_name: true }
          },
          class: {
            select: { id: true, name: true, capacity: true }
          }
        }
      });

      return booking;
    }, {
      // Transaction options for better isolation
      isolationLevel: Prisma.TransactionalIsolationLevel.Serializable, // Highest isolation level to prevent race conditions
      timeout: 10000, // 10 second timeout
      maxWait: 2000   // Max wait time for lock
    }); 
    // Nếu DB bận → chờ tối đa 2s để bắt đầu
    // Khi đã chạy → phải xong trong 10s

    res.status(201).json(newBooking);
});

// Update booking by ID with transaction
const updateBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const updatedBooking = await prisma.$transaction(async (tx) => {
      // Verify booking exists
      const booking = await tx.booking.findUnique({
        where: { id }
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      // Update booking with new status
      const updated = await tx.booking.update({
        where: { id },
        data: { status },
        include: {
          member: {
            select: { id: true, email: true, full_name: true }
          },
          class: {
            select: { id: true, name: true }
          }
        }
      });

      return updated;
    });

    res.status(200).json(updatedBooking);
});

// Cancel booking with transaction (soft delete by changing status)
const cancelBooking = catchAsync(async (req, res) => {
    const { id } = req.params;
    const member_id = req.user.userId;

    const cancelledBooking = await prisma.$transaction(async (tx) => {
      // Verify booking belongs to user
      const booking = await tx.booking.findUnique({
        where: { id }
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      if (booking.member_id !== member_id) {
        throw new AppError('Unauthorized to cancel this booking', 403);
      }

      // Check if booking can be cancelled (not already cancelled)
      if (booking.status === 'cancelled') {
        throw new AppError('Booking is already cancelled', 400);
      }

      // Cancel the booking
      const updated = await tx.booking.update({
        where: { id },
        data: { status: 'cancelled' },
        include: {
          member: {
            select: { id: true, email: true, full_name: true }
          },
          class: {
            select: { id: true, name: true }
          }
        }
      });

      return updated;
    });

    res.status(200).json(cancelledBooking);
});

// Delete booking (hard delete) - admin only
const deleteBooking = catchAsync(async (req, res) => {
    const { id } = req.params;

    const deletedBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id }
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      const deleted = await tx.booking.delete({
        where: { id },
        include: {
          member: {
            select: { id: true, email: true, full_name: true }
          },
          class: {
            select: { id: true, name: true }
          }
        }
      });

      return deleted;
    });

    res.status(200).json({ message: 'Booking deleted successfully', booking: deletedBooking });
});

module.exports = {
  getAllBookings,
  getBookingById,
  getBookingByUserId,
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBooking
};

