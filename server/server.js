const express = require("express");
const cors = require("cors");
require("dotenv").config();
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded ✅" : "Missing ❌");
const db = require("./models/db");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const itemRoutes = require("./routes/items");
const tradeRoutes = require("./routes/trades");
const ratingsRoutes = require("./routes/ratings");
const notificationsRoutes = require("./routes/notifications");
const reportsRoutes = require("./routes/reports");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({
      message: "Server is running!",
      databaseTime: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});