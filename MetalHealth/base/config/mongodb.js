const mongoose = require('mongoose');

const connectDB = () => {
  mongoose
    .connect("mongodb://127.0.0.1:27017/MentalHealth")
    .then(() => console.log("MongoDB connected."))
    .catch((err) => console.error("MongoDB error:", err));
};

module.exports = connectDB;
