require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const labourRoutes = require("./routes/labourRoutes");

const app = express();


app.use(express.json());
app.use(cors());

connectDB();

app.use("/api/labour", labourRoutes);

app.use((err, req, res, next) => {
  console.error("FULL ERROR:", err);
  res.status(500).json({ 
    message: err.message || "Server Error",
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});