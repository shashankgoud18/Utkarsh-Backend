require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const labourRoutes = require("./routes/labourRoutes");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/labour", labourRoutes);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: "Server Error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});