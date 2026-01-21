const express = require('express');
const router = express.Router();
const passport = require('passport');
const authMiddleware = require('../middleware/authMiddleware');

const { memberRegister, memberLogin, staffLogin, logOut, googleSuccess, facebookSuccess } = require('../controllers/authControllers');

router.post('/user-login', memberLogin);
router.post('/user-register', memberRegister);
router.post('/staff-login', staffLogin);

router.post('/logout', authMiddleware, logOut);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login' }), googleSuccess);

router.get('/facebook', passport.authenticate('facebook', { scope: ['profile'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: 'http://localhost:5173/login' }), facebookSuccess);