const express = require("express");
const { Category } = require("../models");
const { authMiddleware, validateCategory } = require("../middleware");

const router = express.Router();

// Get all categories for authenticated user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { includeDefault = true } = req.query;
    
    const query = {
      $or: [
        { userId: req.userId }
      ]
    };
    
    // Include default categories if requested
    if (includeDefault === "true") {
      query.$or.push({ isDefault: true });
    }
    
    const categories = await Category.find(query)
      .sort({ isDefault: -1, name: 1 });
    
    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get category by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { isDefault: true }
      ]
    });
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    res.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// Create new category
router.post("/", authMiddleware, validateCategory, async (req, res) => {
  try {
    const categoryData = {
      ...req.body,
      userId: req.userId,
      isDefault: false
    };
    
    const category = new Category(categoryData);
    await category.save();
    
    res.status(201).json({
      message: "Category created successfully",
      category
    });
  } catch (error) {
    console.error("Create category error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Category with this name already exists"
      });
    }
    
    res.status(500).json({ error: "Failed to create category" });
  }
});

// Update category
router.put("/:id", authMiddleware, validateCategory, async (req, res) => {
  try {
    // Only allow updating user-created categories, not default ones
    const category = await Category.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.userId,
        isDefault: false
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ 
        error: "Category not found or cannot be modified" 
      });
    }
    
    res.json({
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    console.error("Update category error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Category with this name already exists"
      });
    }
    
    res.status(500).json({ error: "Failed to update category" });
  }
});

// Delete category
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    // Only allow deleting user-created categories, not default ones
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
      isDefault: false
    });
    
    if (!category) {
      return res.status(404).json({ 
        error: "Category not found or cannot be deleted" 
      });
    }
    
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Toggle category active status
router.patch("/:id/toggle", authMiddleware, async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.userId,
      isDefault: false
    });
    
    if (!category) {
      return res.status(404).json({ 
        error: "Category not found or cannot be modified" 
      });
    }
    
    category.isActive = !category.isActive;
    await category.save();
    
    res.json({
      message: `Category ${category.isActive ? "activated" : "deactivated"} successfully`,
      category
    });
  } catch (error) {
    console.error("Toggle category error:", error);
    res.status(500).json({ error: "Failed to toggle category status" });
  }
});

// Get category usage statistics
router.get("/:id/stats", authMiddleware, async (req, res) => {
  try {
    const { Expense } = require("../models");
    
    const categoryId = req.params.id;
    const { startDate, endDate } = req.query;
    
    // Verify category belongs to user or is default
    const category = await Category.findOne({
      _id: categoryId,
      $or: [
        { userId: req.userId },
        { isDefault: true }
      ]
    });
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    const matchQuery = {
      userId: req.userId,
      categoryId: categoryId
    };
    
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }
    
    const stats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          avgAmount: { $avg: "$amount" },
          minAmount: { $min: "$amount" },
          maxAmount: { $max: "$amount" }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalAmount: 0,
      totalTransactions: 0,
      avgAmount: 0,
      minAmount: 0,
      maxAmount: 0
    };
    
    res.json({
      category: {
        id: category._id,
        name: category.name,
        color: category.color,
        icon: category.icon
      },
      stats: result,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    console.error("Get category stats error:", error);
    res.status(500).json({ error: "Failed to get category statistics" });
  }
});

// Create default categories for user (useful for migration or manual setup)
router.post("/defaults", authMiddleware, async (req, res) => {
  try {
    const existingCategories = await Category.find({ userId: req.userId });
    
    if (existingCategories.length > 0) {
      return res.status(400).json({
        error: "User already has categories. Cannot create defaults."
      });
    }
    
    const categories = await Category.createDefaultCategories(req.userId);
    
    res.status(201).json({
      message: "Default categories created successfully",
      categories
    });
  } catch (error) {
    console.error("Create default categories error:", error);
    res.status(500).json({ error: "Failed to create default categories" });
  }
});

module.exports = router;