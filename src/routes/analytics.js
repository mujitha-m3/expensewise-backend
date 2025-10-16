const express = require("express");
const { Expense, Income, Category } = require("../models");
const { authMiddleware } = require("../middleware");

const router = express.Router();

// Get dashboard analytics
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const { period = "monthly" } = req.query;
    let startDate, endDate;
    
    const now = new Date();
    
    switch (period) {
      case "weekly":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = new Date();
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    const dateFilter = {
      userId: req.userId,
      date: { $gte: startDate, $lte: endDate }
    };
    
    // Get expense summary
    const expenseSummary = await Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          avgAmount: { $avg: "$amount" }
        }
      }
    ]);
    
    // Get income summary
    const incomeSummary = await Income.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          avgAmount: { $avg: "$amount" }
        }
      }
    ]);
    
    // Get top expense categories
    const topCategories = await Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$categoryId",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      { $sort: { totalAmount: -1 } },
      { $limit: 5 }
    ]);
    
    // Calculate savings rate
    const expenses = expenseSummary[0] || { totalAmount: 0, totalTransactions: 0, avgAmount: 0 };
    const income = incomeSummary[0] || { totalAmount: 0, totalTransactions: 0, avgAmount: 0 };
    const savingsRate = income.totalAmount > 0 ? 
      ((income.totalAmount - expenses.totalAmount) / income.totalAmount) * 100 : 0;
    
    res.json({
      period: {
        type: period,
        startDate,
        endDate
      },
      summary: {
        totalExpenses: expenses.totalAmount,
        totalIncome: income.totalAmount,
        netAmount: income.totalAmount - expenses.totalAmount,
        savingsRate: Math.round(savingsRate * 100) / 100,
        expenseTransactions: expenses.totalTransactions,
        incomeTransactions: income.totalTransactions
      },
      topCategories,
      trends: {
        avgExpensePerTransaction: expenses.avgAmount || 0,
        avgIncomePerTransaction: income.avgAmount || 0
      }
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard analytics" });
  }
});

// Get spending trends over time
router.get("/trends/spending", authMiddleware, async (req, res) => {
  try {
    const { period = "monthly", months = 6 } = req.query;
    
    let groupBy, dateRange;
    const now = new Date();
    
    switch (period) {
      case "daily":
        // Last 30 days, grouped by day
        dateRange = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        groupBy = {
          year: { $year: "$date" },
          month: { $month: "$date" },
          day: { $dayOfMonth: "$date" }
        };
        break;
      case "weekly":
        // Last 12 weeks, grouped by week
        dateRange = new Date(now.getTime() - (12 * 7 * 24 * 60 * 60 * 1000));
        groupBy = {
          year: { $year: "$date" },
          week: { $week: "$date" }
        };
        break;
      case "monthly":
      default:
        // Last N months, grouped by month
        dateRange = new Date(now.getFullYear(), now.getMonth() - parseInt(months), 1);
        groupBy = {
          year: { $year: "$date" },
          month: { $month: "$date" }
        };
    }
    
    const trends = await Expense.aggregate([
      {
        $match: {
          userId: req.userId,
          date: { $gte: dateRange }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } }
    ]);
    
    res.json({
      period,
      dateRange: {
        startDate: dateRange,
        endDate: now
      },
      trends
    });
  } catch (error) {
    console.error("Spending trends error:", error);
    res.status(500).json({ error: "Failed to fetch spending trends" });
  }
});

// Get category-wise expense breakdown
router.get("/breakdown/categories", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = { userId: req.userId };
    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = new Date(startDate);
      if (endDate) matchQuery.date.$lte = new Date(endDate);
    }
    
    const breakdown = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$categoryId",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" },
          maxAmount: { $max: "$amount" },
          minAmount: { $min: "$amount" }
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      { $sort: { totalAmount: -1 } }
    ]);
    
    const total = breakdown.reduce((sum, item) => sum + item.totalAmount, 0);
    
    const breakdownWithPercentage = breakdown.map(item => ({
      ...item,
      percentage: total > 0 ? (item.totalAmount / total) * 100 : 0
    }));
    
    res.json({
      breakdown: breakdownWithPercentage,
      total,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (error) {
    console.error("Category breakdown error:", error);
    res.status(500).json({ error: "Failed to fetch category breakdown" });
  }
});

// Get income vs expense comparison
router.get("/comparison/income-expense", authMiddleware, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - parseInt(months), 1);
    
    const groupBy = {
      year: { $year: "$date" },
      month: { $month: "$date" }
    };
    
    const expenseData = await Expense.aggregate([
      {
        $match: {
          userId: req.userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalExpenses: { $sum: "$amount" }
        }
      }
    ]);
    
    const incomeData = await Income.aggregate([
      {
        $match: {
          userId: req.userId,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalIncome: { $sum: "$amount" }
        }
      }
    ]);
    
    // Merge expense and income data
    const comparisonMap = new Map();
    
    expenseData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      comparisonMap.set(key, { 
        ...item._id, 
        totalExpenses: item.totalExpenses, 
        totalIncome: 0 
      });
    });
    
    incomeData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      if (comparisonMap.has(key)) {
        comparisonMap.get(key).totalIncome = item.totalIncome;
      } else {
        comparisonMap.set(key, { 
          ...item._id, 
          totalExpenses: 0, 
          totalIncome: item.totalIncome 
        });
      }
    });
    
    const comparison = Array.from(comparisonMap.values())
      .map(item => ({
        ...item,
        netAmount: item.totalIncome - item.totalExpenses,
        savingsRate: item.totalIncome > 0 ? 
          ((item.totalIncome - item.totalExpenses) / item.totalIncome) * 100 : 0
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    
    res.json({
      comparison,
      period: {
        months: parseInt(months),
        startDate,
        endDate: now
      }
    });
  } catch (error) {
    console.error("Income vs expense comparison error:", error);
    res.status(500).json({ error: "Failed to fetch income vs expense comparison" });
  }
});

// Get budget analysis (if budgets are implemented later)
router.get("/budget/analysis", authMiddleware, async (req, res) => {
  try {
    // Placeholder for budget analysis
    // This would require a Budget model to be implemented
    res.json({
      message: "Budget analysis feature coming soon",
      budgets: []
    });
  } catch (error) {
    console.error("Budget analysis error:", error);
    res.status(500).json({ error: "Failed to fetch budget analysis" });
  }
});

// Get financial summary report
router.get("/reports/summary", authMiddleware, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);
    
    const dateFilter = {
      userId: req.userId,
      date: { $gte: startDate, $lte: endDate }
    };
    
    // Annual totals
    const [expenseTotal, incomeTotal] = await Promise.all([
      Expense.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Income.aggregate([
        { $match: dateFilter },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ])
    ]);
    
    const expenses = expenseTotal[0] || { total: 0, count: 0 };
    const income = incomeTotal[0] || { total: 0, count: 0 };
    
    // Monthly breakdown
    const monthlyBreakdown = await Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { month: { $month: "$date" } },
          totalExpenses: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);
    
    // Top categories
    const topExpenseCategories = await Expense.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$categoryId",
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      year: parseInt(year),
      summary: {
        totalIncome: income.total,
        totalExpenses: expenses.total,
        netAmount: income.total - expenses.total,
        savingsRate: income.total > 0 ? 
          ((income.total - expenses.total) / income.total) * 100 : 0,
        totalTransactions: expenses.count + income.count
      },
      monthlyBreakdown,
      topExpenseCategories,
      period: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error("Summary report error:", error);
    res.status(500).json({ error: "Failed to generate summary report" });
  }
});

module.exports = router;