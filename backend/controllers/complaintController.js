const Complaint = require('../models/complaintModel');
const User = require('../models/userModel');
const Order = require('../models/orderModel');

// @desc    Submit a new complaint
// @route   POST /api/complaints
// @access  Public/Private
exports.submitComplaint = async (req, res) => {
    try {
        const { userId, orderId, category, subject, description, name, email } = req.body;

        // If userId is provided, use it. Otherwise, try to find user by email or create a placeholder if needed.
        // For a seamless experience, we'll allow guest submissions but ideally require a user reference if they are logged in.
        let userRef = userId;
        if (!userRef && email) {
            const user = await User.findOne({ email });
            if (user) userRef = user._id;
        }

        // Validate required fields based on the model
        if (!category || !subject || !description) {
            return res.status(400).json({ message: "Category, subject and description are required." });
        }

        const complaint = new Complaint({
            user: userRef || "000000000000000000000000", // Placeholder if guest
            order: orderId || null,
            category,
            subject,
            description,
            status: 'Open',
            priority: 'Medium'
        });

        await complaint.save();

        res.status(201).json({
            message: "Complaint submitted successfully.",
            complaintId: complaint._id
        });
    } catch (error) {
        console.error("Submit Complaint Error:", error);
        res.status(500).json({ message: "Failed to submit complaint." });
    }
};

// @desc    Get complaint status
// @route   GET /api/complaints/status/:id
// @access  Public
exports.getComplaintStatus = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('order', 'trackingStatus createdAt');

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found." });
        }

        res.json({
            id: complaint._id,
            status: complaint.status,
            category: complaint.category,
            createdAt: complaint.createdAt,
            resolution: complaint.resolution
        });
    } catch (error) {
        console.error("Get Complaint Status Error:", error);
        res.status(500).json({ message: "Server error." });
    }
};
