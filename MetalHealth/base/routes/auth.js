const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Register new user
router.post("/signup", async (req, res) => {
  try {
    const { name, phoneno, age, email, password, instagram_token } = req.body

    // Validation
    if (!name || !phoneno || !age || !email || !password) {
      return res.status(400).json({
        message: "All required fields must be provided",
        required: ["name", "phoneno", "age", "email", "password"],
      })
    }

    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(email)
    if (existingUserByEmail) {
      return res.status(409).json({ message: "User with this email already exists" })
    }

    const existingUserByPhone = await User.findByPhone(phoneno)
    if (existingUserByPhone) {
      return res.status(409).json({ message: "User with this phone number already exists" })
    }

    // Age validation
    if (age <= 0) {
      return res.status(400).json({ message: "Age must be greater than 0" })
    }

    // Create new user
    const userId = await User.create({
      name,
      phoneno,
      age,
      email,
      password,
      instagram_token,
    })

    // Generate JWT token
    const token = jwt.sign({ userId: userId, email: email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    })

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: userId,
        name,
        email,
        phoneno,
        age,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)

    // Handle specific MySQL errors
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email or phone number already exists" })
    }

    res.status(500).json({ message: "Internal server error during signup" })
  }
})

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      })
    }

    // Find user by email
    const user = await User.findByEmail(email)
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.user_id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    })

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        phoneno: user.phoneno,
        age: user.age,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Internal server error during login" })
  }
})

// Get current user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        phoneno: user.phoneno,
        age: user.age,
        instagram_token: user.instagram_token,
      },
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
})

// Verify token
router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    message: "Token is valid",
    user: {
      id: req.user.user_id,
      user_id: req.user.user_id,
      name: req.user.name,
      email: req.user.email,
    },
  })
})

// Logout (client-side token removal, but we can blacklist tokens if needed)
router.post("/logout", authenticateToken, (req, res) => {
  res.json({ message: "Logout successful" })
})

module.exports = router
