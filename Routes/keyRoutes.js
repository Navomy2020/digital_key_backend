import express from 'express';
import { handleHardwareScan,loginFaculty,getKeyLogs, getIcLogs, getPendingKeys, getPendingIC, getKeyLogsByDate } from '../controller/controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';


const router = express.Router();

// This defines the "Endpoint"
// When the ESP32 sends a POST request to /api/scan, it triggers handleScan
router.post('/scan', handleHardwareScan);
router.post('/login',loginFaculty);
router.get('/keylogs',verifyToken,getKeyLogs);
router.get('/iclogs',verifyToken,getIcLogs);
router.get('/pendingkey',verifyToken,getPendingKeys);
router.get('/pendingic',verifyToken,getPendingIC);
router.get('/verify-session', verifyToken, (req, res) => {
    res.status(200).json({ success: true, message: "Authenticated" });
});
router.get('/keylogsbydate',verifyToken,getKeyLogsByDate);


export default router;