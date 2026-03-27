import express from 'express';
import { handleHardwareScan,loginFaculty,getKeyLogs, getIcLogs, getPendingKeys, getPendingIC, getKeyLogsByDate, getIcLogsByDate } from '../controller/controller.js';
import { verifyToken } from '../middleware/authMiddleware.js';


const router = express.Router();


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
router.get('/iclogsbydate',verifyToken,getIcLogsByDate)


export default router;