const jwt = require("jsonwebtoken")
const User = require("../models/User")

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: "Invalid token" })
    }

    // Ensure user object has user_id property for consistency
    req.user = {
      ...user,
      user_id: user.user_id
    }
    next()
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ message: "Invalid or expired token" })
  }
}

module.exports = { authenticateToken }
