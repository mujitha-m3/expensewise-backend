const express = require("express");
const { validateRegistration, validateLogin, authMiddleware } = require("../middleware");
const authController = require("../controllers/authController");

const router = express.Router();

// Register
router.post("/register", validateRegistration, (req, res) => authController.register(req, res));

// Login
router.post("/login", validateLogin, (req, res) => authController.login(req, res));

// Refresh token
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

// Logout (remove provided refresh token or all tokens for authenticated user)
router.post('/logout', (req, res) => authController.logout(req, res));


// Update user profile
router.put('/profile', authMiddleware, (req, res) => authController.updateProfile(req, res));

module.exports = router;

