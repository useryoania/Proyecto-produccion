const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public routes for lead generation and tracking
router.post('/event', analyticsController.trackEvent);
router.post('/lead', analyticsController.submitLead);

// Protected routes for Sales CRM
router.get('/leads', verifyToken, analyticsController.getLeads);
router.put('/leads/:id', verifyToken, analyticsController.updateLead);
router.get('/leads/:id/events', verifyToken, analyticsController.getLeadEvents);

// Analytics dashboard summary
router.get('/summary', verifyToken, analyticsController.getAnalyticsSummary);

module.exports = router;
