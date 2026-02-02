const prisma = require('../prisma');

// Get all checkins
const getAllCheckins = async (req, res) => {
  try {
    const checkins = await prisma.checkin.findMany();
    res.status(200).json(checkins);
    
  } catch (error) {
    res.status(500).json({ msg: 'Server error'});
  }
};

// Create new checkins
const createCheckin = async (req, res) => {
  try {

    const {member_id, checkin_time, source} = req.body;
    const newCheckin = await prisma.checkin.create({
      data: {
        member_id,
        checkin_time,
        source
      }
    });
    res.status(201).json(newCheckin);
    
  } catch (error) {
    res.status(500).json({ msg: 'Server error'});
  }
};

module.exports = {
  getAllCheckins,
  createCheckin
};
