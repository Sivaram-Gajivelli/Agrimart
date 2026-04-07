const express = require('express');
const router = express.Router();
const { submitComplaint, getComplaintStatus } = require('../controllers/complaintController');

// @route   POST /api/complaints
// @desc    Submit a new complaint
// @access  Public/Private
router.post('/', submitComplaint);

// @route   GET /api/complaints/status/:id
// @desc    Get status of a specific complaint
// @access  Public
router.get('/status/:id', getComplaintStatus);

module.exports = router;
