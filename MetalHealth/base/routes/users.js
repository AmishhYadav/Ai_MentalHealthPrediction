const express = require("express")
const User = require("../models/User")
const { authenticateToken } = require("../middleware/auth")
const { getDatabase } = require("../config/database") // Updated to use new database import

const router = express.Router()

// Get all users (protected route)
router.get("/", authenticateToken, async (req, res) => {
  try {
    // This would typically be admin-only
    const db = await getDatabase() // Get database instance
    const [users] = await db.query("SELECT user_id, name, phoneno, age, email FROM Users")
    res.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Get user by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id

    // Users can only access their own data unless admin
    if (req.user.user_id !== Number.parseInt(userId)) {
      return res.status(403).json({ message: "Access denied" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ user })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Update user profile
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id
    const { name, phoneno, age, instagram_token } = req.body

    // Users can only update their own data
    if (req.user.user_id !== Number.parseInt(userId)) {
      return res.status(403).json({ message: "Access denied" })
    }

    // Update user data
    const db = await getDatabase() // Get database instance
    await db.query(`UPDATE Users SET name = '${name}', phoneno = '${phoneno}', age = ${age}, instagram_token = '${instagram_token || ''}' WHERE user_id = ${userId}`)

    const updatedUser = await User.findById(userId)
    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("Update user error:", error)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Phone number already exists" })
    }
    res.status(500).json({ message: "Internal server error" })
  }
})

module.exports = router
