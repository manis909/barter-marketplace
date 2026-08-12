const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded" : "Missing");

const db = require("./models/db");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const itemRoutes = require("./routes/items");
const tradeRoutes = require("./routes/trades");
const chatRoutes = require("./routes/chat");
const ratingsRoutes = require("./routes/ratings");
const feedbackRoutes = require("./routes/feedback");
const notificationsRoutes = require("./routes/notifications");
const reportsRoutes = require("./routes/reports");
const verificationRoutes = require("./routes/verification");
const skillBookingsRoutes = require("./routes/skillBookings");
const rateLimit = require("express-rate-limit");
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded chat attachments (images/videos) as static files
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/skill-bookings", skillBookingsRoutes);
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

// ------------------------------------------------------------
// Wrap Express in a plain HTTP server so Socket.io can attach to it
// ------------------------------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' },
});

// ------------------------------------------------------------
// Socket-level auth — runs BEFORE a connection is accepted.
// Rejects any client that doesn't present a valid JWT.
// Client is expected to connect like:
//   io(URL, { auth: { token: localStorageToken } })
// ------------------------------------------------------------
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});
require('./routes/notifications').setIO(io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "user:", socket.user?.userId);
  socket.join(`user:${socket.user.userId}`);

  socket.on("joinTrade", async (tradeOfferId) => {
    try {
      const result = await db.query(
        'SELECT sender_id, receiver_id FROM trade_offers WHERE id = $1',
        [tradeOfferId]
      );
      const trade = result.rows[0];
      if (!trade) return;

      const isParticipant = trade.sender_id === socket.user.userId || trade.receiver_id === socket.user.userId;
      if (!isParticipant) {
        console.log(`Blocked unauthorized joinTrade attempt: user ${socket.user.userId} on trade ${tradeOfferId}`);
        return;
      }

      socket.join(String(tradeOfferId));
    } catch (err) {
      console.error('joinTrade error:', err);
    }
  });

  require('./sockets/skillBookingChatHandlers')(io, socket);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});
// Make io accessible inside route files via req.app.get('io')
app.set("io", io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});