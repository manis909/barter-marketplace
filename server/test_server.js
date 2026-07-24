// server.js
// Entry point — combines all 4 members' route files with Socket.io
// for realtime chat. Run with: node server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------
// Mount everyone's routes
// ------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/items', require('./routes/items'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/reports', require('./routes/reports'));

// ------------------------------------------------------------
// Wrap Express in a plain HTTP server so Socket.io can attach to it
// ------------------------------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // TODO before final submission: replace '*' with the real deployed
    // frontend URL, e.g. 'https://your-app.vercel.app'
    origin: '*',
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
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // available in all handlers below as socket.user
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

// ------------------------------------------------------------
// Connection handling — one trade = one room, so messages only
// broadcast to the 2 users actually in that trade.
// ------------------------------------------------------------
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id, 'user:', socket.user?.id);

  socket.on('joinTrade', (tradeOfferId) => {
    socket.join(String(tradeOfferId));
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Make io accessible inside route files via req.app.get('io')
app.set('io', io);

// ------------------------------------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));