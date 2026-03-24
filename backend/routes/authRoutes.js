const express = require('express');
const router = express.Router();
const passport = require('passport');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

const { memberRegister, memberCompleteProfile, getMe, memberLogin, staffLogin, logOut, refreshToken, getStaff, googleSuccess, facebookSuccess, forgotPassword, resetPassword, verifyResetCode } = require('../controllers/authControllers');
const { loginLimiter } = require('../middleware/rateLimit');

// Apply loginLimiter to login endpoints to prevent brute-force attempts
router.post('/member-login', loginLimiter, memberLogin);
router.post('/member-register', memberRegister);
router.patch('/complete-profile', authMiddleware, memberCompleteProfile);
router.get('/me', authMiddleware, getMe); 

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', {session: false, failureRedirect: 'http://54.169.157.109:3001/login'}),
googleSuccess);

router.get('/facebook', passport.authenticate('facebook', { scope: ['profile'] }));
router.get('/facebook/callback', passport.authenticate('facebook', {session: false, failureRedirect: 'http://localhost:3001/login'}),
facebookSuccess);

router.post('/logout', authMiddleware, logOut);
// refresh token endpoint does not require previous auth
router.get('/refresh-token', refreshToken);

// Forgot Password Routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Staff 
router.get('/staff', authMiddleware, staffMiddleware, getStaff);
router.post('/staff-login', loginLimiter, staffLogin);

module.exports = router; 

