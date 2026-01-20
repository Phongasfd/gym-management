const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

// User-Member Registration
const memberRegister = async (req, res) => {
  const {full_name, phone, email, gender, date_of_birth, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); 
  // 10 is the salt rounds, complexity of the hash

  await prisma.member.create({
    data: {
      full_name,
      phone,
      email,
      gender,
      date_of_birth,
      password_hash: hashedPassword
    }
  });
  res.status(201).json({msg : 'Member registered successfully'});
};

// User-Member Login JWT
const memberLogin = async (req, res) => {
  const { email, password } = req.body;

  const member = await prisma.member.findUnique({
    where: { email }
  });
  if (!member) {
    return res.status(400).json({ msg: 'Invalid email' });
  }

  const isPasswordValid  = await bcrypt.compare(password, member.password_hash);
  if(!isPasswordValid) return res.status(400).json({ msg: 'Invalid password' });

  const token = jwt.sign({ userType: "member", memberId: member.id}, process.env.JWT_SECRET, {expiresIn: '7d'});

  // Send token in HTTP-only cookie
  res.cookie('access_token', token, {
    httpOnly: true, // JS cannot access
    secure: false, // set to true in production with HTTPS
    sameSite: 'Lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(200).json({ msg: 'Login successful', user: { id: member.id, full_name: member.full_name, email: member.email } });

};

// Admin-Staff Login JWT 
const staffLogin = async (req, res) => {
  const { email, password } = req.body;

  const staff = await prisma.staff.findUnique({
    where: { email }
  }); 
  if (!staff) {
    return res.status(400).json({ msg: 'Invalid email' });
  } 
  const isPasswordValid  = await bcrypt.compare(password, staff.password_hash);
  if(!isPasswordValid) return res.status(400).json({ msg: 'Invalid password' });

  const token = jwt.sign({ userType: "staff", staffId: staff.id, role: staff.role}, process.env.JWT_SECRET, {expiresIn: '7d'});
  // Send token in HTTP-only cookie
  res.cookie('access_token', token, {
    httpOnly: true, // JS cannot access
    secure: false, // set to true in production with HTTPS
    sameSite: 'Lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  res.status(200).json({ msg: 'Login successful', user: { id: staff.id, full_name: staff.full_name, email: staff.email, role: staff.role } });  

};

const logOut = (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax'
  });
  res.status(200).json({ msg: 'Logged out successfully' });
};

