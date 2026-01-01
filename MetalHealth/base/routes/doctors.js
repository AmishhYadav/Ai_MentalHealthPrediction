const express = require("express")
const Doctor = require("../models/Doctor")

const router = express.Router()

// Get doctors by specialty (must come before /:id route)
router.get("/speciality/:speciality", async (req, res) => {
  try {
    const { speciality } = req.params
    console.log(`Fetching doctors with specialty: ${speciality}`)
    const doctors = await Doctor.findBySpeciality(speciality)
    console.log(`Found ${doctors.length} doctors with specialty ${speciality}`)
    res.json({ doctors })
  } catch (error) {
    console.error("Error fetching doctors by specialty:", error.message)
    res.status(500).json({ message: "Failed to fetch doctors by specialty", error: error.message })
  }
})

// Get all doctors
router.get("/", async (req, res) => {
  try {
    console.log("Fetching all doctors...")
    const doctors = await Doctor.findAll()
    console.log("Doctors fetched successfully:", doctors)
    res.json({ doctors })
  } catch (error) {
    console.error("Error fetching doctors:", error.message)
    res.status(500).json({ message: "Failed to fetch doctors", error: error.message })
  }
})

// Get doctor by ID (must come after /speciality/:speciality route)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Fetching doctor with ID: ${id}`)
    const doctor = await Doctor.findById(id)
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" })
    }
    console.log("Doctor fetched successfully:", doctor)
    res.json({ doctor })
  } catch (error) {
    console.error("Error fetching doctor by ID:", error.message)
    res.status(500).json({ message: "Failed to fetch doctor", error: error.message })
  }
})

module.exports = router
