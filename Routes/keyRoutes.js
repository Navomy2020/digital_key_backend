import express from 'express';
import { handleScan } from '../controller/controller.js';

const router = express.Router();

// This defines the "Endpoint"
// When the ESP32 sends a POST request to /api/scan, it triggers handleScan
router.post('/scan', handleScan);

export default router;