const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Category } = require("../models");
const { validateRegistration, validateLogin } = require("../middleware");

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
};

// Register
router.post("/register", validateRegistration, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: "User already exists with this email"
      });
    }

    // Password will be hashed by User model pre-save hook
    // Create user
    const user = new User({
      name,
      email,
      password: password
    });

    await user.save();

    // Create default categories for the user
    try {
      await Category.createDefaultCategories(user._id);
    } catch (error) {
      console.warn("Failed to create default categories:", error);
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// Login
router.post("/login", validateLogin, async (req, res) => {
  console.log(" LOGIN ATTEMPT STARTED!");
  try {
    const { email, password } = req.body;
  console.log(" Login email:", email);
  console.log(" Password provided:", !!password);

    // Find user
    const user = await User.findOne({ email });
  console.log(" User found:", !!user);
  console.log(" User email in DB:", user?.email);
    if (!user) {
      return res.status(400).json({
        error: "Invalid email or password"
      });
    }

    // Check password
    console.log(" Comparing passwords...");
  console.log(" Stored hash:", user.password?.substring(0, 20) + "...");
  const isValidPassword = await bcrypt.compare(password, user.password);
  console.log(" Password comparison result:", isValidPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        error: "Invalid email or password"
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;

