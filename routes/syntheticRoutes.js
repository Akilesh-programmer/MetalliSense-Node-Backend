const express = require('express');
const syntheticController = require('../controllers/syntheticController');

const router = express.Router();

// OPC connection routes
router.get('/opc-status', syntheticController.getOPCStatus);
router.post('/opc-connect', syntheticController.connectOPCClient);
router.post('/opc-disconnect', syntheticController.disconnectOPCClient);

// Synthetic reading generation
router.post(
  '/generate-synthetic',
  syntheticController.generateSyntheticReading,
);

module.exports = router;
