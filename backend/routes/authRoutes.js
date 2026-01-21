const express = require('express');
const router = express.Router();
const passport = require('passport');
const authMiddleware = require('../middleware/authMiddleware');

const { memberRegister, memberLogin, staffLogin, logOut, googleSuccess, facebookSuccess } = require('../controllers/authControllers');

router.post('/member-login', memberLogin);
router.post('/staff-login', staffLogin);
router.post('/member-register', memberRegister);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/success', googleSuccess);

router.get('/facebook', passport.authenticate('facebook', { scope: ['profile'] }));
router.get('/facebook/success', facebookSuccess);

router.post('/logout', authMiddleware, logOut);

module.exports = router; 
