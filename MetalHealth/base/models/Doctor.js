const { getDatabase } = require("../config/database")

class Doctor {
  constructor(doctorData) {
    this.name = doctorData.name
    this.speciality = doctorData.speciality
    this.phoneno = doctorData.phoneno
    this.details = doctorData.details
  }

  // Create new doctor
  static async create(doctorData) {
    try {
      const db = await getDatabase() // Ensure database is initialized
      const [result] = await db.query(
        `INSERT INTO Doctors (name, speciality, phoneno, details) VALUES ('${doctorData.name}', '${doctorData.speciality}', '${doctorData.phoneno}', '${doctorData.details}')`
      )
      return result.insertId
    } catch (error) {
      throw error
    }
  }

  // Find all doctors
  static async findAll() {
    try {
      const db = await getDatabase() // Ensure database is initialized
      const [rows] = await db.query("SELECT * FROM Doctors")
      return rows
    } catch (error) {
      console.error("Database query failed:", error.message)
      throw error
    }
  }

  // Find doctor by ID
  static async findById(id) {
    try {
      const db = await getDatabase() // Ensure database is initialized
      const [rows] = await db.query(`SELECT * FROM Doctors WHERE doctor_id = ${id}`)
      return rows[0] || null
    } catch (error) {
      throw error
    }
  }

  // Find doctors by speciality
  static async findBySpeciality(speciality) {
    try {
      const db = await getDatabase() // Ensure database is initialized
      const [rows] = await db.query(`SELECT * FROM Doctors WHERE speciality = '${speciality}'`)
      return rows
    } catch (error) {
      throw error
    }
  }
}

module.exports = Doctor
