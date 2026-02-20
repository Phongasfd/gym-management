const express = require('express');
const router = express.Router();
const passport = require('passport');
const { authMiddleware, staffMiddleware } = require('../middleware/authMiddleware');

const { memberRegister, memberCompleteProfile, getMe, memberLogin, staffLogin, logOut, getStaff, googleSuccess, facebookSuccess } = require('../controllers/authControllers');

router.post('/member-login', memberLogin);
router.post('/member-register', memberRegister);
router.patch('/complete-profile', authMiddleware, memberCompleteProfile);
router.get('/me', authMiddleware, getMe); 

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', {session: false, failureRedirect: 'http://localhost:3001/login'}),
googleSuccess);

router.get('/facebook', passport.authenticate('facebook', { scope: ['profile'] }));
router.get('/facebook/callback', passport.authenticate('facebook', {session: false, failureRedirect: 'http://localhost:3001/login'}),
facebookSuccess);

router.post('/logout', authMiddleware, logOut);

// Staff 
router.get('/staff', authMiddleware, staffMiddleware, getStaff);
router.post('/staff-login', staffLogin);

module.exports = router; 

