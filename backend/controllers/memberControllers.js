const prisma = require('../prisma');

// Create a new member
const createMember = async (req, res) => {
  try {
    const { full_name, phone, email, gender, date_of_birth } = req.body;
    const member = await prisma.member.create({
      data: {
        full_name,
        phone,
        email,
        gender,
        date_of_birth
      }
    });
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get all members
const getAllMembers = async (req, res) => {
  try {
    const members = await prisma.member.findMany();
    res.status(200).json(members);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get a member by ID
const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await prisma.member.findUnique({
      where: { id: id },
    });
    if(!member){
      res.status(404).json({ msg: 'Member not found' });
    }
    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Update a member by ID
const updateMemberById = async (req, res) => {
  try { 
    
    const { id } = req.params;
    const { full_name, phone, email, gender, date_of_birth } = req.body;
    const member = await prisma.member.update({
      where: { id: id },
      data: {
        full_name,
        phone,
        email,
        gender,
        date_of_birth
      }
    });
    res.status(200).json(member);

  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};



module.exports = {
  createMember,
  getAllMembers,
  getMemberById,
  updateMemberById
};