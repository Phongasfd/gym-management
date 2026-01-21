const express = require('express');
const router = express.Router();
const passport = require('passport');
const authMiddleware = require('../middleware/authMiddleware');

const { memberRegister, memberLogin, staffLogin, logOut, getStaff, googleSuccess, facebookSuccess } = require('../controllers/authControllers');

router.post('/member-login', memberLogin);
router.post('/staff-login', staffLogin);
router.post('/member-register', memberRegister);
router.get('/staff', authMiddleware, getStaff);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', {session: false, failureRedirect: 'http://localhost:5173/login'}),
googleSuccess);

router.get('/facebook', passport.authenticate('facebook', { scope: ['profile'] }));
router.get('/facebook/callback', passport.authenticate('facebook', {session: false, failureRedirect: 'http://localhost:5173/login'}),
facebookSuccess);

router.post('/logout', authMiddleware, logOut);

module.exports = router; 

