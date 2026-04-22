const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Get all checkins
const getAllCheckins = catchAsync(async (req, res) => {
    const checkins = await prisma.checkin.findMany();
    res.status(200).json(checkins);
    
});

// Create new checkins
const createCheckin = catchAsync(async (req, res) => {
    const {member_id, checkin_time, source} = req.body;
    const newCheckin = await prisma.checkin.create({
      data: {
        member_id,
        checkin_time,
        source
      }
    });
    res.status(201).json(newCheckin);
    
});

module.exports = {
  getAllCheckins,
  createCheckin
};
