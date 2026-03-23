import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // 1. Grab the 'Authorization' header
    const authHeader = req.headers.authorization;

    // 2. Check if the header exists and starts with "Bearer "
    // The browser sends: "Bearer eyJhbGciOiJIUzI1Ni..."
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
        
        // 4. Attach the faculty info to the request for use in controllers
        req.faculty = verified; 
        
        // 5. Success! Move to the next function (e.g., getIcLogs)
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