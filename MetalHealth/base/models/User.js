const { getDatabase } = require("../config/database") // Updated to use getDatabase
const bcrypt = require("bcryptjs")

class User {
  constructor(userData) {
    this.name = userData.name
    this.phoneno = userData.phoneno
    this.age = userData.age
    this.email = userData.email
    this.password = userData.password
    this.instagram_token = userData.instagram_token || null
  }

  // Create new user
  static async create(userData) {
    try {
      const db = await getDatabase() // Ensure database is initialized
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      const [result] = await db.query(
        `INSERT INTO Users (name, phoneno, age, email, password, instagram_token) VALUES ('${userData.name}', '${userData.phoneno}', ${userData.age}, '${userData.email}', '${hashedPassword}', '${userData.instagram_token || ''}')`
      )
      return result.insertId
    } catch (error) {
      throw error
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const db = await getDatabase() // Ensure database is initialized
      const [rows] = await db.query(`SELECT * FROM Users WHERE email = '${email}'`)
      return rows[0] || null
    } catch (error) {
      throw error
    }
  }

  // Find user by phone number
  static async findByPhone(phoneno) {
    try {
      const db = await getDatabase() // Ensure database is initialized
      const [rows] = await db.query(`SELECT * FROM Users WHERE phoneno = '${phoneno}'`)
      return rows[0] || null
    } catch (error) {
      throw error
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const db = await getDatabase() // Ensure database is initialized
      const idInt = parseInt(id);
      const [rows] = await db.query(
        `SELECT user_id, name, phoneno, age, email, instagram_token FROM Users WHERE user_id = ${idInt}`
      )
      return rows[0] || null
    } catch (error) {
      throw error
    }
  }

  // Validate password
  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword)
  }
}

module.exports = User
