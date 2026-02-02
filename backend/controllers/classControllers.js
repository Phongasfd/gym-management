const prisma = require('../prisma');

// Get all classes
const getAllClasses = async (req, res) => {
  try {

    const classes = await prisma.class.findMany();
    res.status(200).json(classes);
    
  } catch (error) {
    res.status(500).json({ msg: 'Server error'});
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
      return res.status(404).json({ msg: 'Class not found' });
    }
    res.status(200).json(classItem);
    
  } catch (error) {
    res.status(500).json({ msg: 'Server error'});
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
    res.status(500).json({ msg: 'Server error'});
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
    res.status(500).json({ msg: 'Server error'});
  }
};

// Delete class by ID
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.class.delete({
      where: { id: id }
    });
    res.status(200).json({ msg: 'Class deleted successfully'});
    
  } catch (error) {
    res.status(500).json({ msg: 'Server error'});
  }
};

module.exports = {
  getAllClasses,
  getClasById,
  createClass,
  updateClass,
  deleteClass
};  