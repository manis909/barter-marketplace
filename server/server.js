const express = require("express");
const cors = require("cors");
require("dotenv").config();
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded ✅" : "Missing ❌");
const db = require("./models/db");
const chatRoutes = require("./routes/chat");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/chat", chatRoutes);

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