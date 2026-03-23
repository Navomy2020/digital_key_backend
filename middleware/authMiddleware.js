import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check if Authorization header exists
  if (!authHeader) {
    return res.status(403).json({
      success: false,
      message: "Access Denied. Please login.",
    });
  }

  // 2. Extract token: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: "Invalid Authorization header format. Use 'Bearer <token>'.",
    });
  }

  const token = parts[1];

  try {
    // 3. Verify the token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.faculty = verified; // store faculty info in request
    next(); // proceed to route handler
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token has expired.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or malformed token.",
    });
  }
};
