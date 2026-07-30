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
const notificationsRoutes = require("./routes/notifications");
const reportsRoutes = require("./routes/reports");
const verificationRoutes = require("./routes/verification");

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded chat attachments (images/videos) as static files
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/verification", verificationRoutes);
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
  cors: {
    // TODO before final submission: replace '*' with the real deployed
    // frontend URL, e.g. 'https://your-app.vercel.app'
    origin: "*",
  },
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
    socket.user = decoded; // available in all handlers below as socket.user
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});

// ------------------------------------------------------------
// Connection handling — one trade = one room, so messages only
// broadcast to the 2 users actually in that trade.
// ------------------------------------------------------------

// In-memory presence tracking: userId → Set of socket IDs
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "user:", socket.user?.userId);

  const userId = socket.user.userId;
  const userRoom = `user:${userId}`;
  socket.join(userRoom);

  // Track presence
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // Notify everyone in the same trade rooms that this user is now online.
  // We broadcast after joining so recipients receive it correctly.
  socket.broadcast.emit("userOnline", { userId });

  socket.on("joinTrade", (tradeOfferId) => {
    socket.join(String(tradeOfferId));
  });

  // When the user opens a chat, notify the other party their messages are read
  socket.on("markRead", ({ tradeOfferId }) => {
    if (!tradeOfferId) return;
    // Emit only to others in the trade room (not back to the reader)
    socket.to(String(tradeOfferId)).emit("messagesRead", {
      tradeOfferId,
      readBy: userId,
    });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        // All connections for this user gone — they are now offline
        socket.broadcast.emit("userOffline", { userId });
      }
    }
  });
});

// Make io accessible inside route files via req.app.get('io')
app.set("io", io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});