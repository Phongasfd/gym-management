const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';

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

  // payload shared between access & refresh tokens
  const payload = { userType: "member", userId: member.id };
  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refresh = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

  // Send tokens in HTTP-only cookies
  res.cookie('access_token', access, {
    httpOnly: true, // JS cannot access
    secure: isProd, // set to true in production with HTTPS
    sameSite: isProd? 'none': 'lax', // CSRF protection
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  res.cookie('refresh_token', refresh, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax',
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

  // same payload for both tokens
  const payload = { userType: "staff", staffId: staff.id, role: staff.role };
  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refresh = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

  // Send in cookies
  res.cookie('access_token', access, {
    httpOnly: true, // JS cannot access
    secure: isProd, // set to true in production with HTTPS
    sameSite: isProd? 'none': 'lax', // CSRF protection
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  res.cookie('refresh_token', refresh, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
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
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });
  // also clear refresh token when logging out
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });
  res.status(200).json({ msg: 'Logged out successfully' });
};

// issue new access token using refresh token
const refreshToken = (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) {
    return res.status(401).json({ msg: 'No refresh token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    // rebuild payload – we simply re-use what was stored
    const { userType, userId, staffId, role } = decoded;
    const payload = { userType };
    if (userId) payload.userId = userId;
    if (staffId) {
      payload.staffId = staffId;
      payload.role = role;
    }

    const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    // Optionally rotate refresh token by issuing a new one
    const refresh = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('access_token', access, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd? 'none': 'lax',
      maxAge: 15 * 60 * 1000
    });
    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd? 'none': 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ msg: 'Token refreshed' });
  } catch (error) {
    return res.status(403).json({ msg: 'Invalid refresh token', error: error.message });
  }
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
    const access_token = jwt.sign(
      {
        userId: member.id,
        userType: "member",
        needCompleteProfile: true
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refresh_token = jwt.sign(
      {
        userId: member.id,
        userType: "member",
        needCompleteProfile: true
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd? 'none': 'lax'
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd? 'none': 'lax'
    });

    return res.redirect("http://54.169.157.109.nip.io/complete-profile");
  }

  const token = jwt.sign(
    {
      userId: member.id,
      userType: "member",
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });

  return res.redirect("http://54.169.157.109.nip.io");

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

  return res.redirect("https://54.169.157.109.nip.io/complete-profile");
}

const token = jwt.sign(
  {
    userId: member.id,
    userType: "member",
  },
  process.env.JWT_SECRET,
  { expiresIn: "15m" }
);

res.cookie("access_token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax"
});

return res.redirect("http://54.169.157.109.nip.io");
};

// Forgot Password - Generate and send reset code
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      logger.warn('Forgot password attempt without email', { ip: req.ip });
      return res.status(400).json({ msg: 'Email is required' });
    }

    // Find member by email
    const member = await prisma.member.findUnique({
      where: { email }
    });

    // Don't reveal if email exists (security best practice)
    if (!member) {
      logger.warn('Forgot password for non-existent email', { email, ip: req.ip });
      return res.status(200).json({ msg: 'If an account exists with this email, a reset code will be sent' });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save reset code to database
    await prisma.member.update({
      where: { id: member.id },
      data: {
        reset_code: resetCode,
        reset_code_expires: resetCodeExpires
      }
    });

    // Send email with reset code
    const { sendPasswordResetEmail } = require('../services/emailService');
    const emailSent = await sendPasswordResetEmail(email, resetCode);

    if (!emailSent) {
      logger.error('Failed to send password reset email', { email });
      return res.status(500).json({ msg: 'Failed to send reset code. Please try again later.' });
    }

    logger.info('Password reset code sent', { email });
    res.status(200).json({ msg: 'If an account exists with this email, a reset code will be sent' });

  } catch (error) {
    logger.error('Forgot password error', { error: error.message });
    res.status(500).json({ msg: 'An error occurred. Please try again later.' });
  }
};

// Verify reset code and update password
const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    // Validate inputs
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ msg: 'Email, reset code, and new password are required' });
    }

    // Find member
    const member = await prisma.member.findUnique({
      where: { email }
    });

    if (!member) {
      return res.status(401).json({ msg: 'Invalid email or reset code' });
    }

    // Check if reset code matches and is not expired
    if (member.reset_code !== resetCode) {
      logger.warn('Invalid reset code attempt', { email });
      return res.status(401).json({ msg: 'Invalid email or reset code' });
    }

    if (!member.reset_code_expires || new Date() > member.reset_code_expires) {
      logger.warn('Expired reset code attempt', { email });
      return res.status(401).json({ msg: 'Reset code has expired. Please request a new one.' });
    }

    // Validate new password strength (at least 8 characters)
    if (newPassword.length < 8) {
      return res.status(400).json({ msg: 'Password must be at least 8 characters long' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset code
    await prisma.member.update({
      where: { id: member.id },
      data: {
        password_hash: hashedPassword,
        reset_code: null,
        reset_code_expires: null
      }
    });

    logger.info('Password reset successfully', { email });
    res.status(200).json({ msg: 'Password has been reset successfully. Please log in with your new password.' });

  } catch (error) {
    logger.error('Reset password error', { error: error.message });
    res.status(500).json({ msg: 'An error occurred. Please try again later.' });
  }
};

// Verify reset code (without changing password)
const verifyResetCode = async (req, res) => {
  try {
    const { email, resetCode } = req.body;

    if (!email || !resetCode) {
      return res.status(400).json({ msg: 'Email and reset code are required' });
    }

    const member = await prisma.member.findUnique({
      where: { email }
    });

    if (!member) {
      return res.status(401).json({ msg: 'Invalid email or reset code' });
    }

    if (member.reset_code !== resetCode) {
      return res.status(401).json({ msg: 'Invalid reset code' });
    }

    if (!member.reset_code_expires || new Date() > member.reset_code_expires) {
      return res.status(401).json({ msg: 'Reset code has expired' });
    }

    res.status(200).json({ msg: 'Reset code is valid' });

  } catch (error) {
    logger.error('Verify reset code error', { error: error.message });
    res.status(500).json({ msg: 'An error occurred. Please try again later.' });
  }
};

module.exports = {
  memberRegister,
  memberCompleteProfile, 
  getMe, 
  memberLogin,
  staffLogin,
  logOut,
  refreshToken,
  getStaff,
  googleSuccess,
  facebookSuccess,
  forgotPassword,
  resetPassword,
  verifyResetCode
};
