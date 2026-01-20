const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

// User-Member Registration
const memberRegister = async (req, res) => {
  const {full_name, phone, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); 
  // 10 is the salt rounds, complexity of the hash

  await prisma.member.create({
    data: {

    }
  });
  res.json({msg : 'Member registered successfully'});
}

// User-Member Login JWT
