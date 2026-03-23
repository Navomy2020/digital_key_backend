import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // 1. Grab the token from cookies
    const token = req.cookies.faculty_session;

    if (!token) {
        return res.status(403).json({ success: false, message: "Access Denied. Please login." });
    }

    try {
        // 2. Verify the token using your JWT_SECRET from .env
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        req.faculty = verified; // Store faculty info in the request
        next(); // Move to the actual getLogs function
    } catch (err) {
        res.status(401).json({ success: false, message: "Invalid Token" });
    }
};