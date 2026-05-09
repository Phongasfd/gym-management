const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../prismaClient');
const logger = require('../utils/logger');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const isProd = process.env.NODE_ENV === 'production';

const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS || '7', 10);
// parse env variable or default to 7 days, ensure it's an decimal integer
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// User-Member Registration
const memberRegister = catchAsync(async (req, res, next) => {
  const {full_name, phone, email, gender, date_of_birth, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

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
});

const memberCompleteProfile = catchAsync(async (req, res, next) => {
  const { fullName, phone, dob, gender } = req.body;
  const { userId } = req.user;

  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

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
});

const getMe = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401);
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
});

// User-Member Login JWT
const memberLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const member = await prisma.member.findUnique({
    where: { email }
  });
  if (!member) {
    logger.warn('Login failed', { type: 'LOGIN_FAIL', email, ip: req.ip || req.connection?.remoteAddress, status: 401 });
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid  = await bcrypt.compare(password, member.password_hash);
  if(!isPasswordValid) {
    logger.warn('Login failed', { type: 'LOGIN_FAIL', email, ip: req.ip || req.connection?.remoteAddress, status: 401 });
    throw new AppError('Invalid credentials', 401);
  }

  // payload shared between access & refresh tokens
  const payload = { userType: "member", userId: member.id };
  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  // create opaque refresh token, store hashed in DB for rotation
  const refreshTokenRaw = generateRefreshToken();
  const refreshHash = hashToken(refreshTokenRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      user_id: member.id,
      user_type: 'member',
      token_hash: refreshHash,
      expires_at: expiresAt,
      created_by_ip: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent') || null
    }
  });

  // Send tokens in HTTP-only cookies
  res.cookie('access_token', access, {
    httpOnly: true, // JS cannot access
    secure: isProd, // set to true in production with HTTPS
    sameSite: isProd? 'none': 'lax', // CSRF protection
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  res.cookie('refresh_token', refreshTokenRaw, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000 // days
  });

  res.status(200).json({ msg: 'Login successful', user: { id: member.id, full_name: member.full_name, email: member.email } });

});

// Admin-Staff Login JWT 
const staffLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const staff = await prisma.user.findUnique({
    where: { email }
  }); 
  if (!staff) {
    logger.warn('Login failed', { type: 'LOGIN_FAIL', email, ip: req.ip || req.connection?.remoteAddress, status: 401 });
    throw new AppError('Invalid credentials', 401);
  } 
  const isPasswordValid  = await bcrypt.compare(password, staff.password_hash);
  if(!isPasswordValid) {
    logger.warn('Login failed', { type: 'LOGIN_FAIL', email, ip: req.ip || req.connection?.remoteAddress, status: 401 });
    throw new AppError('Invalid credentials', 401);
  }

  // same payload for both tokens
  const payload = { userType: "staff", staffId: staff.id, role: staff.role };
  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  // create opaque refresh token, store hashed in DB for rotation
  const refreshTokenRaw = generateRefreshToken();
  const refreshHash = hashToken(refreshTokenRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      user_id: staff.id,
      user_type: 'staff',
      token_hash: refreshHash,
      expires_at: expiresAt,
      created_by_ip: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent') || null
    }
  });

  // Send in cookies
  res.cookie('access_token', access, {
    httpOnly: true, // JS cannot access
    secure: isProd, // set to true in production with HTTPS
    sameSite: isProd? 'none': 'lax', // CSRF protection
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  res.cookie('refresh_token', refreshTokenRaw, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  });

  res.status(200).json({ msg: 'Login successful', user: { id: staff.id, full_name: staff.full_name, email: staff.email, role: staff.role } });  

});

const getStaff = catchAsync(async (req, res) => {
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
});

const logOut = catchAsync(async (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });
  // also clear refresh token when logging out
  // revoke refresh token in DB if present
  const incoming = req.cookies.refresh_token;
  if (incoming) {
    try {
      const h = hashToken(incoming);
      await prisma.refreshToken.updateMany({ where: { token_hash: h }, data: { revoked: true } });
    } catch (e) {
      // ignore
    }
  }
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });
  res.status(200).json({ msg: 'Logged out successfully' });
});
// issue new access token using opaque refresh token (rotation)
const refreshToken = catchAsync(async (req, res) => {
  const incoming = req.cookies.refresh_token;
  if (!incoming) {
    throw new AppError('No refresh token', 401);
  }

  const tokenHash = hashToken(incoming);
  const tokenRecord = await prisma.refreshToken.findFirst({ where: { token_hash: tokenHash } });
  if (!tokenRecord) {
    throw new AppError('Invalid refresh token', 401);
  }

  if (tokenRecord.revoked) {
    // token reuse or revoked; revoke all sessions for this user
    await prisma.refreshToken.updateMany({ where: { user_id: tokenRecord.user_id }, data: { revoked: true } });
    throw new AppError('Refresh token revoked', 401);
  }

  if (new Date() > tokenRecord.expires_at) {
    await prisma.refreshToken.updateMany({ where: { id: tokenRecord.id }, data: { revoked: true } });
    throw new AppError('Refresh token expired', 401);
  }

  // build payload from user_type and id
  const payload = {};
  if (tokenRecord.user_type === 'member') {
    payload.userType = 'member';
    payload.userId = tokenRecord.user_id;
  } else if (tokenRecord.user_type === 'staff') {
    payload.userType = 'staff';
    payload.staffId = tokenRecord.user_id;
    // try to include role if available
    const staff = await prisma.user.findUnique({ where: { id: tokenRecord.user_id } });
    if (staff) payload.role = staff.role;
  }

  const access = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

  // rotate refresh token: create a new one and revoke the old
  const newRaw = generateRefreshToken();
  const newHash = hashToken(newRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  const newRecord = await prisma.refreshToken.create({
    data: {
      user_id: tokenRecord.user_id,
      user_type: tokenRecord.user_type,
      token_hash: newHash,
      expires_at: expiresAt,
      created_by_ip: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent') || null
    }
  });

  await prisma.refreshToken.update({ where: { id: tokenRecord.id }, data: { revoked: true, replaced_by: newRecord.id } });

  res.cookie('access_token', access, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax',
    maxAge: 15 * 60 * 1000
  });
  res.cookie('refresh_token', newRaw, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000
  });

  res.status(200).json({ msg: 'Token refreshed' });
});

const googleSuccess = catchAsync(async (req, res) => {
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

    // create opaque refresh token for social incomplete-flow
    const refreshTokenRaw = generateRefreshToken();
    const refreshHash = hashToken(refreshTokenRaw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        user_id: member.id,
        user_type: 'member',
        token_hash: refreshHash,
        expires_at: expiresAt,
        created_by_ip: req.ip || req.connection?.remoteAddress,
        user_agent: req.get('User-Agent') || null
      }
    });

    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd? 'none': 'lax'
    });

    res.cookie("refresh_token", refreshTokenRaw, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd? 'none': 'lax'
    });

    if (process.env.NODE_ENV === 'production') {
      return res.redirect("http://54.169.157.109.nip.io/complete-profile");
    } else {
      return res.redirect("http://localhost:3001/complete-profile");
    }
  }

  const token = jwt.sign(
    {
      userId: member.id,
      userType: "member",
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  // create and set refresh token for full social login too
  const refreshTokenRawMain = generateRefreshToken();
  const refreshHashMain = hashToken(refreshTokenRawMain);
  const expiresAtMain = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      user_id: member.id,
      user_type: 'member',
      token_hash: refreshHashMain,
      expires_at: expiresAtMain,
      created_by_ip: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent') || null
    }
  });

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });
  res.cookie("refresh_token", refreshTokenRawMain, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });

  if(process.env.NODE_ENV === 'production') {
    return res.redirect("http://54.169.157.109.nip.io");
  } else {
    return res.redirect("http://localhost:3001");
  } 
});

const facebookSuccess = catchAsync(async (req, res) => {
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

  // create opaque refresh token
  const refreshTokenRaw = generateRefreshToken();
  const refreshHash = hashToken(refreshTokenRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      user_id: member.id,
      user_type: 'member',
      token_hash: refreshHash,
      expires_at: expiresAt,
      created_by_ip: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent') || null
    }
  });

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });
  res.cookie("refresh_token", refreshTokenRaw, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
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

  // create opaque refresh token for full login
  const refreshTokenRawMain = generateRefreshToken();
  const refreshHashMain = hashToken(refreshTokenRawMain);
  const expiresAtMain = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      user_id: member.id,
      user_type: 'member',
      token_hash: refreshHashMain,
      expires_at: expiresAtMain,
      created_by_ip: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent') || null
    }
  });

  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });
  res.cookie("refresh_token", refreshTokenRawMain, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd? 'none': 'lax'
  });

  return res.redirect("http://54.169.157.109.nip.io");
});

// Forgot Password - Generate and send reset code
const forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;

    // Validate email
    if (!email) {
      logger.warn('Forgot password attempt without email', { ip: req.ip });
      throw new AppError('Email is required', 400);
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
      throw new AppError('Failed to send reset code. Please try again later.', 500);
    }

    logger.info('Password reset code sent', { email });
    res.status(200).json({ msg: 'If an account exists with this email, a reset code will be sent' });

});

// Verify reset code and update password
const resetPassword = catchAsync(async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

    // Validate inputs
    if (!email || !resetCode || !newPassword) {
      throw new AppError('Email, reset code, and new password are required', 400);
    }

    // Find member
    const member = await prisma.member.findUnique({
      where: { email }
    });


    // Check if reset code matches and is not expired
    if (member.reset_code !== resetCode) {
      logger.warn('Invalid reset code attempt', { email });
      throw new AppError('Invalid email or reset code', 401);
    }

    if (!member.reset_code_expires || new Date() > member.reset_code_expires) {
      logger.warn('Expired reset code attempt', { email });
      throw new AppError('Reset code has expired', 401);
    }

    // Validate new password strength (at least 8 characters)
    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
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

});

// Verify reset code (without changing password)
const verifyResetCode = catchAsync(async (req, res) => {
  const { email, resetCode } = req.body;

    if (!email || !resetCode) {
      throw new AppError('Email and reset code are required', 400);
    }

    const member = await prisma.member.findUnique({
      where: { email }
    });

    if (!member) {
      throw new AppError('Invalid email or reset code', 401);
    }

    if (member.reset_code !== resetCode) {
      throw new AppError('Invalid reset code', 401);
    }

    if (!member.reset_code_expires || new Date() > member.reset_code_expires) {
      throw new AppError('Reset code has expired', 401);
    }

    res.status(200).json({ msg: 'Reset code is valid' });

});

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
