const Allocation = require('../models/Allocation');

// Get all allocations for a user
exports.getAllocations = async (req, res) => {
  try {
    const { userId } = req.query;
    
    console.log('Getting allocations for user:', userId);
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    // Validate userId format
    if (typeof userId !== 'string' || userId.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const allocations = await Allocation.find({ 
      userId: userId, 
      isActive: true 
    }).sort({ createdAt: -1 });

    console.log(`Found ${allocations.length} allocations for user ${userId}`);

    res.status(200).json({
      success: true,
      allocations,
      count: allocations.length
    });
  } catch (error) {
    console.error('Error getting allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching allocations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new allocation
exports.createAllocation = async (req, res) => {
  try {
    const {
      userId,
      categoryId,
      categoryName,
      percentage,
      budgetLimit,
      templateId,
      bucketName
    } = req.body;

    console.log('Creating allocation with data:', {
      userId,
      categoryId,
      categoryName,
      percentage,
      budgetLimit,
      templateId,
      bucketName
    });

    // Validate required fields
    if (!userId || !categoryName || percentage === undefined || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, categoryName, percentage, templateId'
      });
    }

    // Check if allocation already exists for this template
    const existingAllocation = await Allocation.findOne({ 
      userId, 
      templateId 
    });

    if (existingAllocation) {
      return res.status(400).json({
        success: false,
        message: 'Allocation with this template ID already exists'
      });
    }

    const allocation = new Allocation({
      userId,
      categoryId,
      categoryName,
      percentage,
      budgetLimit,
      templateId,
      bucketName
    });

    await allocation.save();

    console.log('Allocation created successfully:', allocation._id);

    res.status(201).json({
      success: true,
      message: 'Allocation created successfully',
      allocation
    });
  } catch (error) {
    console.error('Error creating allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating allocation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update allocation
exports.updateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      categoryName,
      percentage,
      budgetLimit
    } = req.body;

    console.log('Updating allocation:', id, 'with data:', {
      categoryId,
      categoryName,
      percentage,
      budgetLimit
    });

    const allocation = await Allocation.findById(id);

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation not found'
      });
    }

    // Update fields
    if (categoryName !== undefined) allocation.categoryName = categoryName;
    if (categoryId !== undefined) allocation.categoryId = categoryId;
    if (percentage !== undefined) allocation.percentage = percentage;
    if (budgetLimit !== undefined) allocation.budgetLimit = budgetLimit;

    await allocation.save();

    console.log('Allocation updated successfully:', allocation._id);

    res.status(200).json({
      success: true,
      message: 'Allocation updated successfully',
      allocation
    });
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating allocation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete allocation (HARD delete)
exports.deleteAllocation = async (req, res) => {
    try {
      const { id } = req.params;
  
      console.log('Deleting allocation:', id);
  
      const allocation = await Allocation.findByIdAndDelete(id);
  
      if (!allocation) {
        return res.status(404).json({
          success: false,
          message: 'Allocation not found'
        });
      }
  
      console.log('Allocation hard deleted successfully:', id);
  
      res.status(200).json({
        success: true,
        message: 'Allocation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting allocation:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting allocation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };

// Get allocation by template ID (for sync purposes)
exports.getAllocationByTemplateId = async (req, res) => {
  try {
    const { templateId } = req.params;

    console.log('Getting allocation by template ID:', templateId);

    const allocation = await Allocation.findOne({ 
      templateId, 
      isActive: true 
    });

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Allocation not found'
      });
    }

    res.status(200).json({
      success: true,
      allocation
    });
  } catch (error) {
    console.error('Error getting allocation by template ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching allocation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bulk operations for sync
exports.bulkUpdateAllocations = async (req, res) => {
  try {
    const { operations } = req.body;

    console.log('Bulk operations requested:', operations);

    if (!Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        message: 'Operations must be an array'
      });
    }

    const results = [];

    for (const operation of operations) {
      try {
        const { action, data } = operation;

        switch (action) {
          case 'create':
            const newAllocation = new Allocation(data);
            await newAllocation.save();
            results.push({ action: 'create', success: true, id: newAllocation._id });
            break;

          case 'update':
            const updatedAllocation = await Allocation.findByIdAndUpdate(
              data._id,
              { $set: data },
              { new: true }
            );
            if (updatedAllocation) {
              results.push({ action: 'update', success: true, id: data._id });
            } else {
              results.push({ action: 'update', success: false, id: data._id, error: 'Not found' });
            }
            break;

          case 'delete':
            const deletedAllocation = await Allocation.findByIdAndUpdate(
              data._id,
              { $set: { isActive: false } },
              { new: true }
            );
            if (deletedAllocation) {
              results.push({ action: 'delete', success: true, id: data._id });
            } else {
              results.push({ action: 'delete', success: false, id: data._id, error: 'Not found' });
            }
            break;

          default:
            results.push({ action, success: false, error: 'Unknown action' });
        }
      } catch (opError) {
        console.error('Error in bulk operation:', opError);
        results.push({ action: operation.action, success: false, error: opError.message });
      }
    }

    console.log('Bulk operations completed:', results);

    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in bulk operations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk operations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};