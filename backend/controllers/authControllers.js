const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const logger = require('../utils/logger');

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
      date_of_birth: new Date(date_of_birth),
      password_hash: hashedPassword,
      isProfileComplete: true
    }
  });
  res.status(201).json({msg : 'Member registered successfully'});
};

const memberCompleteProfile = async (req, res) => {
  try {
    const { fullName, phone, dob, gender } = req.body;
    const { userId } = req.user;

    await prisma.member.update({
      where: { id: userId },
      data: {
        full_name: fullName,
        phone,
        gender,
        date_of_birth: new Date(dob),
        isProfileComplete: true,
      }
    });

    res.status(200).json({ msg: 'Member Profile Completed' });

  } catch (error) {
    res.status(500).json({
      msg: 'Failed to complete profile',
      error: error.message
    });
  }
};

const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  const member = await prisma.member.findUnique({
    where: {
      id: req.user.userId
    }
  });

  res.status(200).json({
    id: req.user.userId,
    full_name: member.full_name,
    email: member.email,
    phone: member.phone,
    date_of_birth: member.date_of_birth,
    gender: member.gender,
    isProfileComplete: member.isProfileComplete
  });
};

// User-Member Login JWT
const memberLogin = async (req, res) => {
  const { email, password } = req.body;

  const member = await prisma.member.findUnique({
    where: { email }
  });
  if (!member) {
    logger.warn('Login failed', { type: 'LOGIN_FAIL', email, ip: req.ip || req.connection?.remoteAddress, status: 401 });
    return res.status(401).json({ msg: 'Invalid credentials' });
  }

  const isPasswordValid  = await bcrypt.compare(password, member.password_hash);
  if(!isPasswordValid) {
    logger.warn('Login failed', { type: 'LOGIN_FAIL', email, ip: req.ip || req.connection?.remoteAddress, status: 401 });
    return res.status(401).json({ msg: 'Invalid credentials' });
  }

  const token = jwt.sign({ userType: "member", userId: member.id}, process.env.JWT_SECRET, {expiresIn: '7d'});

  // Send token in HTTP-only cookie
  res.cookie('access_token', token, {
    httpOnly: true, // JS cannot access
    secure: false, // set to true in production with HTTPS
    sameSite: 'lax', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(200).json({ msg: 'Login successful', user: { id: member.id, full_name: member.full_name, email: member.email } });

};

// Admin-Staff Login JWT 
const staffLogin = async (req, res) => {
  const { email, password } = req.body;

  const staff = await prisma.user.findUnique({
    where: { email }
  }); 
  if (!staff) {
    logger.warn('Login failed', { type: 'LOGIN_FAIL', email, ip: req.ip || req.connection?.remoteAddress, status: 401 });
    return res.status(401).json({ msg: 'Invalid credentials' });
  } 
  const isPasswordValid  = await bcrypt.compare(password, staff.password_hash);
  if(!isPasswordValid) {
    logger.warn('Login failed', { type: 'LOGIN_FAIL', email, ip: req.ip || req.connection?.remoteAddress, status: 401 });
    return res.status(401).json({ msg: 'Invalid credentials' });
  }

  const token = jwt.sign({ userType: "staff", staffId: staff.id, role: staff.role}, process.env.JWT_SECRET, {expiresIn: '7d'});
  // Send token in HTTP-only cookie
  res.cookie('access_token', token, {
    httpOnly: true, // JS cannot access
    secure: false, // set to true in production with HTTPS
    sameSite: 'lax', // cookies will be sent in cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  res.status(200).json({ msg: 'Login successful', user: { id: staff.id, full_name: staff.full_name, email: staff.email, role: staff.role } });  

};

const getStaff = async (req, res) => {
  // authMiddleware already assign req.user
  const user = await prisma.user.findUnique({
    where: { id: req.user.staffId },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true
    }
  });
  res.status(200).json({ user });
};

const logOut = (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  });
  res.status(200).json({ msg: 'Logged out successfully' });
};

const googleSuccess = async (req, res) => {
  const profile = req.user;

  const googleId = profile.id;
  const email = profile.emails?.[0]?.value || null;
  const full_name = profile.displayName;
  
  let member = await prisma.member.findFirst({
    where: {
      OR: [
        { googleId },
        email ? { email } : undefined
      ].filter(Boolean)
    }
  });

  if (!member) {
    member = await prisma.member.create({
      data: {
        full_name,
        email,
        googleId,
        date_of_birth: null,
        gender: null,
        phone: null,
        isProfileComplete: false
      }
    });
  } else if (!member.googleId) {
    member = await prisma.member.update({
      where: { id: member.id },
      data: { googleId }
    });
  }

  const isComplete =
  member.date_of_birth &&
  member.gender &&
  member.phone;

  if (!isComplete) {
    const token = jwt.sign(
      {
        userId: member.id,
        userType: "member",
        needCompleteProfile: true
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    });

    return res.redirect("http://localhost:3001/complete-profile");
  }

  const token = jwt.sign(
    {
      userId: member.id,
      userType: "member",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  });

  return res.redirect("http://localhost:3001");

};

const facebookSuccess = async (req, res) => {
  const profile = req.user;

  const facebookId = profile.id;
  const full_name = profile.displayName;
  
  let member = await prisma.member.findUnique({
    where: {
      facebookId
    }
  });
  

  if (!member) {
    member = await prisma.member.create({
      data: {
        full_name,
        email: null,
        facebookId,
        date_of_birth: null,
        gender: null,
        phone: null,
        isProfileComplete: false
      }
    });
  }

  const isComplete =
  member.date_of_birth &&
  member.gender &&
  member.phone;

if (!isComplete) {
  const token = jwt.sign(
    {
      userId: member.id,
      userType: "member",
      needCompleteProfile: true
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  });

  return res.redirect("http://localhost:3001/complete-profile");
}

const token = jwt.sign(
  {
    userId: member.id,
    userType: "member",
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

res.cookie("access_token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax"
});

return res.redirect("http://localhost:3001");
};

module.exports = {
  memberRegister,
  memberCompleteProfile, 
  getMe, 
  memberLogin,
  staffLogin,
  logOut,
  getStaff,
  googleSuccess,
  facebookSuccess
};
