const express = require("express");
const { Expense, Category } = require("../models");
const { authMiddleware, validateExpense } = require("../middleware");

const router = express.Router();

// Get all expenses for authenticated user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, search } = req.query;
    
    const query = { userId: req.userId };
    
    // Add category filter
    if (category) {
      query.categoryId = category;
    }
    
    // Add date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Add search filter
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }
    
    const expenses = await Expense.find(query)
      .populate("categoryId", "name color icon")
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Expense.countDocuments(query);
    
    res.json({
      expenses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalExpenses: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// Get expense by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.userId
    }).populate("categoryId", "name color icon");
    
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    res.json(expense);
  } catch (error) {
    console.error("Get expense error:", error);
    res.status(500).json({ error: "Failed to fetch expense" });
  }
});

// Create new expense
router.post("/", authMiddleware, validateExpense, async (req, res) => {
  try {
    const expenseData = {
      ...req.body,
      userId: req.userId
    };
    
    // Verify category belongs to user
    const category = await Category.findOne({
      _id: req.body.categoryId,
      $or: [{ userId: req.userId }, { isDefault: true }]
    });
    
    if (!category) {
      return res.status(400).json({ error: "Invalid category" });
    }
    
    const expense = new Expense(expenseData);
    await expense.save();
    
    // Populate category data
    await expense.populate("categoryId", "name color icon");
    
    res.status(201).json({
      message: "Expense created successfully",
      expense
    });
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// Update expense
router.put("/:id", authMiddleware, validateExpense, async (req, res) => {
  try {
    // Verify category belongs to user if category is being updated
    if (req.body.categoryId) {
      const category = await Category.findOne({
        _id: req.body.categoryId,
        $or: [{ userId: req.userId }, { isDefault: true }]
      });
      
      if (!category) {
        return res.status(400).json({ error: "Invalid category" });
      }
    }
    
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    ).populate("categoryId", "name color icon");
    
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    res.json({
      message: "Expense updated successfully",
      expense
    });
  } catch (error) {
    console.error("Update expense error:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

// Delete expense
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }
    
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// Get monthly summary
router.get("/summary/monthly", authMiddleware, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    
    const summary = await Expense.getMonthlySummary(req.userId, parseInt(year), parseInt(month));
    
    const totalAmount = summary.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalTransactions = summary.reduce((sum, item) => sum + item.count, 0);
    
    res.json({
      summary,
      totals: {
        amount: totalAmount,
        transactions: totalTransactions
      },
      period: {
        year: parseInt(year),
        month: parseInt(month)
      }
    });
  } catch (error) {
    console.error("Monthly summary error:", error);
    res.status(500).json({ error: "Failed to get monthly summary" });
  }
});

module.exports = router;