const express = require('express');
const syntheticController = require('../controllers/syntheticController');
const { protect } = require('../middleware/firebaseAuthMiddleware');

const router = express.Router();

// OPC connection routes (require authentication)
router.get('/opc-status', protect, syntheticController.getOPCStatus);
router.post('/opc-connect', protect, syntheticController.connectOPCClient);
router.post(
  '/opc-disconnect',
  protect,
  syntheticController.disconnectOPCClient,
);

// Synthetic reading generation (requires authentication)
router.post(
  '/generate-synthetic',
  protect,
  syntheticController.generateSyntheticReading,
);

module.exports = router;
