const { body, validationResult } = require("express-validator");

// Middleware to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array()
    });
  }
  next();
};

// Validation rules for user registration
const validateRegistration = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  checkValidation
];

// Validation rules for user login
const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  checkValidation
];

// Validation rules for expense creation
const validateExpense = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("description")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Description must be between 1 and 200 characters"),
  body("categoryId")
    .isMongoId()
    .withMessage("Invalid category ID"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),
  checkValidation
];

// Validation rules for income creation
const validateIncome = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("source")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Source must be between 1 and 100 characters"),
  body("category")
    .optional()
    .isIn(["salary", "freelance", "business", "investment", "gift", "bonus", "other"])
    .withMessage("Invalid income category"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format"),
  checkValidation
];

// Validation rules for category creation
const validateCategory = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Name must be between 1 and 50 characters"),
  body("color")
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage("Color must be a valid hex color"),
  body("icon")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Icon name cannot exceed 50 characters"),
  checkValidation
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateExpense,
  validateIncome,
  validateCategory,
  checkValidation
};