import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // 1. Grab the 'Authorization' header
    const authHeader = req.headers.authorization;



    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ 
            success: false, 
            message: "Access Denied. No token provided." 
        });
    }

    try {
        // 3. Verify the token
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        req.faculty = verified; 
        
        next(); 
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        
        // Return 401 if the token is expired or tampered with
        res.status(401).json({ 
            success: false, 
            message: "Session expired or invalid token." 
        });
    }
};