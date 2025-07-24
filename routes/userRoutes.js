const express = require('express');
const authController = require('./../controllers/authController');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/createAdmin', authController.createAdmin); // For manual admin creation

module.exports = router;
