const Income = require("../models/Income");

// income creation function
exports.createIncome = async (req, res) => {
  try {
    const { 
      source, 
      amount, 
      frequency, 
      startDate, 
      category, 
      isRecurring, 
      recurringEndDate, 
      description, 
      tags, 
      notes 
    } = req.body;

    // income validation
    if (!source || !amount) {
      return res.status(400).json({ message: "Source and amount are required" });
    }

    // Validate amount is positive
    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const newIncome = new Income({
      userId: req.user?.id,
      source,
      amount,
      date: startDate || new Date(), // Map startDate to date field, use current date if not provided
      category: category || "other",
      isRecurring: isRecurring || false,
      recurringFrequency: frequency, // Map frequency to recurringFrequency
      recurringEndDate,
      description,
      tags: tags || [],
      notes
    });

    const savedIncome = await newIncome.save();
    res.status(201).json({
      message: "Income created successfully",
      income: savedIncome
    });
  } catch (error) {
    console.error("Error creating income:", error);
    
    // Handle validation errors more specifically - error handling for invalid IDs
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Income with similar details already exists" 
      });
    }
    
    res.status(500).json({ 
      message: "Server error while creating income", 
      error: error.message 
    });
  }
};

// Get all incomes for a user
exports.getIncomes = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      startDate, 
      endDate,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { userId: req.user.id };
    
    // Add category filter if provided
    if (category) {
      filter.category = category;
    }
    
    // Add date range filter if provided
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const incomes = await Income.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email'); // Optional: populate user details

    // Get total count for pagination info
    const totalIncomes = await Income.countDocuments(filter);
    const totalPages = Math.ceil(totalIncomes / parseInt(limit));

    res.status(200).json({
      incomes,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalIncomes,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching incomes:", error);
    res.status(500).json({ 
      message: "Server error while fetching incomes", 
      error: error.message 
    });
  }
};

// Get a single income by ID
exports.getIncomeById = async (req, res) => {
  try {
    const income = await Income.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!income) {
      return res.status(404).json({ 
        message: "Income not found or you don't have permission to access it" 
      });
    }

    res.status(200).json(income);
  } catch (error) {
    console.error("Error fetching income:", error);
    
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid income ID format" 
      });
    }
    
    res.status(500).json({ 
      message: "Server error while fetching income", 
      error: error.message 
    });
  }
};

// Update an income
exports.updateIncome = async (req, res) => {
  try {
    // Map field names if needed
    const updateData = { ...req.body };
    
    // Map startDate to date if provided
    if (updateData.startDate) {
      updateData.date = updateData.startDate;
      delete updateData.startDate;
    }
    
    // Map frequency to recurringFrequency if provided
    if (updateData.frequency) {
      updateData.recurringFrequency = updateData.frequency;
      delete updateData.frequency;
    }
    
    // Remove type field if it exists (not in schema)
    if (updateData.type) {
      delete updateData.type;
    }

    // Validate amount if provided
    if (updateData.amount && updateData.amount <= 0) {
      return res.status(400).json({ 
        message: "Amount must be greater than 0" 
      });
    }

    const updated = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );
    
    if (!updated) {
      return res.status(404).json({ 
        message: "Income not found or you don't have permission to update it" 
      });
    }

    res.status(200).json({
      message: "Income updated successfully",
      income: updated
    });
  } catch (error) {
    console.error("Error updating income:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid income ID format" 
      });
    }
    
    res.status(500).json({ 
      message: "Server error while updating income", 
      error: error.message 
    });
  }
};

// Delete an income
exports.deleteIncome = async (req, res) => {
  try {
    const deleted = await Income.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!deleted) {
      return res.status(404).json({ 
        message: "Income not found or you don't have permission to delete it" 
      });
    }

    res.status(200).json({ 
      message: "Income deleted successfully",
      deletedIncome: {
        id: deleted._id,
        source: deleted.source,
        amount: deleted.amount
      }
    });
  } catch (error) {
    console.error("Error deleting income:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid income ID format" 
      });
    }
    
    res.status(500).json({ 
      message: "Server error while deleting income", 
      error: error.message 
    });
  }
};

// Get income statistics
exports.getIncomeStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = { userId: req.user.id };
    
    // Add date range if provided
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const stats = await Income.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$amount" },
          averageIncome: { $avg: "$amount" },
          incomeCount: { $sum: 1 },
          highestIncome: { $max: "$amount" },
          lowestIncome: { $min: "$amount" }
        }
      }
    ]);

    const categoryStats = await Income.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.status(200).json({
      overview: stats[0] || {
        totalIncome: 0,
        averageIncome: 0,
        incomeCount: 0,
        highestIncome: 0,
        lowestIncome: 0
      },
      byCategory: categoryStats
    });
  } catch (error) {
    console.error("Error fetching income statistics:", error);
    res.status(500).json({ 
      message: "Server error while fetching income statistics", 
      error: error.message 
    });
  }
};

// Get recent incomes
exports.getRecentIncomes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const recentIncomes = await Income.find({ userId: req.user.id })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .select('source amount date category isRecurring');

    res.status(200).json(recentIncomes);
  } catch (error) {
    console.error("Error fetching recent incomes:", error);
    res.status(500).json({ 
      message: "Server error while fetching recent incomes", 
      error: error.message 
    });
  }
};
