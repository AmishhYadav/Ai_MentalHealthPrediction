const mysql = require("mysql2/promise")
require("dotenv").config()

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "NoTScar0812",
  database: process.env.DB_NAME || "MENTALHEALTH",
}

let db
let isInitializing = false

async function initializeDatabase() {
  if (db) {
    return db // Already initialized
  }

  if (isInitializing) {
    // Wait for ongoing initialization
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return db
  }

  isInitializing = true

  try {
    console.log("Initializing database connection...")
    db = await mysql.createConnection(dbConfig)
    console.log("Connected to MySQL database:", dbConfig.database)
    isInitializing = false
    return db
  } catch (error) {
    isInitializing = false
    console.error("Database connection failed:", error.message)
    throw error
  }
}

async function getDatabase() {
  if (!db) {
    console.log("Database not initialized, initializing now...")
    await initializeDatabase()
  }
  return db
}

function isDatabaseReady() {
  return !!db
}

module.exports = {
  initializeDatabase,
  getDatabase,
  isDatabaseReady,
}
