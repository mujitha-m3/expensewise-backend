const express = require("express");
const { Income } = require("../models");
const { authMiddleware, validateIncome } = require("../middleware");

const router = express.Router();

// Get all income records for authenticated user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, startDate, endDate, search } = req.query;
    
    const query = { userId: req.userId };
    
    // Add category filter
    if (category) {
      query.category = category;
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
        { source: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }
    
    const incomes = await Income.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Income.countDocuments(query);
    
    res.json({
      incomes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalIncomes: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Get incomes error:", error);
    res.status(500).json({ error: "Failed to fetch income records" });
  }
});

// Get income by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const income = await Income.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!income) {
      return res.status(404).json({ error: "Income record not found" });
    }
    
    res.json(income);
  } catch (error) {
    console.error("Get income error:", error);
    res.status(500).json({ error: "Failed to fetch income record" });
  }
});

// Create new income record
router.post("/", authMiddleware, validateIncome, async (req, res) => {
  try {
    const incomeData = {
      ...req.body,
      userId: req.userId
    };
    
    const income = new Income(incomeData);
    await income.save();
    
    res.status(201).json({
      message: "Income record created successfully",
      income
    });
  } catch (error) {
    console.error("Create income error:", error);
    res.status(500).json({ error: "Failed to create income record" });
  }
});

// Update income record
router.put("/:id", authMiddleware, validateIncome, async (req, res) => {
  try {
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!income) {
      return res.status(404).json({ error: "Income record not found" });
    }
    
    res.json({
      message: "Income record updated successfully",
      income
    });
  } catch (error) {
    console.error("Update income error:", error);
    res.status(500).json({ error: "Failed to update income record" });
  }
});

// Delete income record
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!income) {
      return res.status(404).json({ error: "Income record not found" });
    }
    
    res.json({ message: "Income record deleted successfully" });
  } catch (error) {
    console.error("Delete income error:", error);
    res.status(500).json({ error: "Failed to delete income record" });
  }
});

// Get monthly income summary
router.get("/summary/monthly", authMiddleware, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const summary = await Income.aggregate([
      {
        $match: {
          userId: req.userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);
    
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
    console.error("Monthly income summary error:", error);
    res.status(500).json({ error: "Failed to get monthly income summary" });
  }
});

// Get income by category
router.get("/category/:category", authMiddleware, async (req, res) => {
  try {
    const { category } = req.params;
    const { startDate, endDate } = req.query;
    
    const query = { 
      userId: req.userId,
      category
    };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const incomes = await Income.find(query).sort({ date: -1 });
    
    res.json({
      category,
      incomes,
      total: incomes.reduce((sum, income) => sum + income.amount, 0)
    });
  } catch (error) {
    console.error("Get income by category error:", error);
    res.status(500).json({ error: "Failed to fetch income by category" });
  }
});

module.exports = router;