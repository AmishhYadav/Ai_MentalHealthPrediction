const express = require("express")
const cors = require("cors")
const { initializeDatabase } = require("./config/database")
const connectDB = require("./config/mongodb")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use(express.json())

async function startServer() {
  try {
    console.log("Starting server initialization...")
    await initializeDatabase()
    console.log("Database initialized successfully")
    
    // Connect to MongoDB
    connectDB()

    console.log("Loading routes...")
    app.use("/api/auth", require("./routes/auth"))
    app.use("/api/users", require("./routes/users"))
    app.use("/api/doctors", require("./routes/doctors"))
    app.use("/api/dailylog", require("./routes/dailylog"))
    app.use("/api/mentalhealth", require("./routes/mentalhealth"))
    app.use("/api/mentalhealth/daily-summary", require("./routes/dailysummary"))
    console.log("Routes loaded successfully")

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error("Server error:", err.stack)
      res.status(500).json({ message: "Something went wrong!" })
    })

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "OK", message: "Server is running" })
    })

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Health check available at http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...")
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...")
  process.exit(0)
})

startServer().catch((error) => {
  console.error("Failed to start server:", error)
  process.exit(1)
})
