const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Get all classes
const getAllClasses = catchAsync(async (req, res) => {

    const classes = await prisma.class.findMany(
      {
        include: {
          _count: {
            select: {
              bookings: true
            }
          }
        },
        take: 5, 
      }
    );
    res.status(200).json(classes);
    
});

const getTodayClassesStats = catchAsync(async (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const classes = await prisma.class.findMany({
      where: {
        schedule_time: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    const totalBookingsToday = classes.reduce(
      (sum, cls) => sum + cls._count.bookings,
      0
    );

    res.status(200).json({
      count: classes.length,
      totalBookingsToday,
      classes: classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        capacity: cls.capacity,
        schedule_time: cls.schedule_time,
        end_time: cls.end_time,
        coach_name: cls.coach_name,
        bookedSlots: cls._count.bookings,
      })),
    });
  }); 


const getClassMembers = catchAsync(async (req, res) => {
 
    const { id } = req.params;
  
    const bookings = await prisma.booking.findMany({
      where: { class_id: id },
      include: {
        member: {
          select: {
            id: true,
            full_name: true,
            phone: true,
            email: true, 
          }
        }
      }
    });
    
    const members = bookings.map( booking => booking.member );  
    res.status(200).json(members);


});


// Get class by ID
const getClasById = catchAsync( async (req, res) => {
    const { id } = req.params;
    const classItem = await prisma.class.findUnique({
      where: { id: id }
    });
    if(!classItem){
      throw new AppError('Class not found', 404);
    }
    res.status(200).json(classItem);
    
});

// Create a new class
const createClass = catchAsync(async (req, res) => {
    const {name, coach_name, schedule_time, capacity} = req.body;
    const newClass = await prisma.class.create({
      data: {
        name,
        coach_name,
        schedule_time,
        capacity
      }
    });
    res.status(201).json(newClass);

});

// Update class by ID
const updateClass = catchAsync(async (req, res) => {

    const { id } = req.params;
    const { name, coach_name, schedule_time, capacity } = req.body;
    const updatedClass = await prisma.class.update({
      where: { id: id },
      data: {
        name,
        coach_name,
        schedule_time,
        capacity
      }
    });
    res.status(200).json(updatedClass);


});

// Delete class by ID
const deleteClass = catchAsync(async (req, res) => {
  const { id } = req.params;
  await prisma.class.delete({
    where: { id: id }
  });
  res.status(200).json({ error: 'Class deleted successfully'});

});

module.exports = {
  getAllClasses,
  getTodayClassesStats,
  getClassMembers,
  getClasById,
  createClass,
  updateClass,
  deleteClass
};  