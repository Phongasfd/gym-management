const prisma = require('../prismaClient');

// Get all classes
const getAllClasses = async (req, res) => {
  try {

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
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTodayClassesStats = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const getClassMembers = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }

};


// Get class by ID
const getClasById = async (req, res) => {
  try {
    const { id } = req.params;
    const classItem = await prisma.class.findUnique({
      where: { id: id }
    });
    if(!classItem){
      return res.status(404).json({ error: 'Class not found' });
    }
    res.status(200).json(classItem);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new class
const createClass = async (req, res) => {
  try {
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

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update class by ID
const updateClass = async (req, res) => {
  try {
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

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete class by ID
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.class.delete({
      where: { id: id }
    });
    res.status(200).json({ error: 'Class deleted successfully'});
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllClasses,
  getTodayClassesStats,
  getClassMembers,
  getClasById,
  createClass,
  updateClass,
  deleteClass
};  