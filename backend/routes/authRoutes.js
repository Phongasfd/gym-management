const express = require('express');
const router = express.Router();
const passport = require('passport');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

const { memberRegister, memberCompleteProfile, getMe, memberLogin, staffLogin, logOut, refreshToken, getStaff, googleSuccess, facebookSuccess, forgotPassword, resetPassword, verifyResetCode } = require('../controllers/authControllers');
const { loginLimiter } = require('../middleware/rateLimit');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and Authorization endpoints
 */

/**
 * @swagger
 * /api/auth/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/member-login:
 *   post:
 *     summary: Member Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/member-register:
 *   post:
 *     summary: Register a new member
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 * /api/auth/complete-profile:
 *   patch:
 *     summary: Complete member profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/refresh-token:
 *   get:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/forgot-password:
 *   post:
 *     summary: Forgot password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/verify-reset-code:
 *   post:
 *     summary: Verify password reset code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/staff-login:
 *   post:
 *     summary: Staff login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Success
 * /api/auth/staff:
 *   get:
 *     summary: Get current authenticated staff
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 */

router.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

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

