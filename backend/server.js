import './config/env.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// DB & Config imports
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

// Middleware imports
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { apiLimiter } from './middleware/securityMiddleware.js';

// Model imports (for Newsletter)
import Newsletter from './models/Newsletter.js';


// Connect DB
connectDB();

const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Middleware stack
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

// Apply global rate limiting
app.use('/api', apiLimiter);

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Newsletter subscription endpoint
app.post('/api/newsletter', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Please provide an email address' });
    }

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already subscribed' });
    }

    await Newsletter.create({ email });

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing to TripNest newsletter!',
    });
  } catch (error) {
    next(error);
  }
});

// If request starts with /api, use notFound and errorHandler
app.use('/api/*', notFound);
app.use(errorHandler);

// In production, serve the frontend build assets
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(buildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Socket.io Real-Time Protocol
const onlineUsers = new Map(); // Maps User ID -> Socket ID

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId && userId !== 'undefined') {
    onlineUsers.set(userId, socket.id);
    io.emit('user_status', { userId, status: 'online' });
    console.log(`Socket Connected: User ${userId} (${socket.id})`);
  }

  // Join a unique conversation room
  socket.on('join_room', (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room: ${conversationId}`);
  });

  // Typing indicators
  socket.on('typing', ({ conversationId, userName }) => {
    socket.to(conversationId).emit('typing', { conversationId, userName });
  });

  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(conversationId).emit('stop_typing', { conversationId });
  });

  // Send message webhook
  socket.on('send_message', ({ conversationId, message }) => {
    // Broadcast back to the room
    io.to(conversationId).emit('new_message', { conversationId, message });

    // Send notifications to offline/other participants
    const recipients = message.conversationParticipants || [];
    recipients.forEach((partId) => {
      if (partId !== message.sender._id) {
        const socketId = onlineUsers.get(partId);
        if (socketId) {
          io.to(socketId).emit('message_notification', {
            conversationId,
            messageText: message.text,
            senderName: message.sender.name,
          });
        }
      }
    });
  });

  // Disconnection handler
  socket.on('disconnect', () => {
    if (userId && userId !== 'undefined') {
      onlineUsers.delete(userId);
      io.emit('user_status', { userId, status: 'offline' });
      console.log(`Socket Disconnected: User ${userId} (${socket.id})`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`TripNest Backend running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
