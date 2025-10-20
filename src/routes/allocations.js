const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');

// Get all allocations for a user
router.get('/', allocationController.getAllocations);

// Create new allocation
router.post('/', allocationController.createAllocation);

// Update allocation
router.put('/:id', allocationController.updateAllocation);

// Delete allocation
router.delete('/:id', allocationController.deleteAllocation);

// Get allocation by template ID
router.get('/template/:templateId', allocationController.getAllocationByTemplateId);

// Bulk operations for sync
router.post('/bulk', allocationController.bulkUpdateAllocations);

module.exports = router;