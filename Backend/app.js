const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
require("dotenv").config();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");

// Database & Models
const dbConnection = require("./config/db");
const userModel = require("./models/users");
const toolModel = require("./models/tool");
const Conversation = require("./models/chat");

// Middleware
const { generateToken, authenticateToken } = require("./middlewares/AuthMiddleware");

// Routes
const userRoute = require("./routes/userRoute");
const toolRoute = require("./routes/toolsRoute");
const chatRoute = require("./routes/chatRoute");

dbConnection();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------- SOCKET.IO -------------------
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Track online users
const onlineUsers = new Set();

io.on('connection', (socket) => {
  console.log('✅ A user connected:', socket.id);

  // Send full online list to new user
  socket.emit('online_users', Array.from(onlineUsers));

  // Join personal room
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`📥 User ${userId} joined their room`);
  });

  // User comes online
  socket.on('user_online', (userId) => {
    socket.userId = userId.toString();
    onlineUsers.add(socket.userId);
    io.emit('online_users', Array.from(onlineUsers));
    console.log(`🟢 User ${userId} is online`);
  });

  // User goes offline manually
  socket.on('user_offline', (userId) => {
    onlineUsers.delete(userId.toString());
    io.emit('online_users', Array.from(onlineUsers));
    console.log(`🔴 User ${userId} is offline`);
  });

  // Typing indicator
  socket.on('typing', ({ conversationId, senderId, senderName, receiverId }) => {
    io.to(receiverId).emit('typing', { conversationId, senderId, senderName });
  });

  socket.on('stop_typing', ({ conversationId, senderId, receiverId }) => {
    io.to(receiverId).emit('stop_typing', { conversationId, senderId });
  });

  // Send message
  socket.on('send_message', async (data) => {
    const { senderId, receiverId, message, conversationId, toolId, senderName } = data;
    try {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        const newMessage = {
          sender: senderId,
          message,
          tool: toolId,
          timestamp: new Date(),
        };
        conversation.messages.push(newMessage);
        conversation.lastMessageAt = new Date();
        await conversation.save();

        const savedMessage = conversation.messages[conversation.messages.length - 1];
        const broadcastData = {
          ...data,
          _id: savedMessage._id,
          timestamp: savedMessage.timestamp,
        };

        io.to(receiverId).emit('receive_message', broadcastData);
        io.to(senderId).emit('receive_message', broadcastData);
      }
    } catch (error) {
      console.error("❌ Error saving message:", error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId.toString());
      io.emit('online_users', Array.from(onlineUsers));
      console.log(`⚫ User ${socket.userId} disconnected`);
    }
  });
});

// ------------------- ROUTES -------------------
app.use("/:user", userRoute);
app.use("/tools", toolRoute);
app.use("/chat", authenticateToken, chatRoute);

app.get("/", (req, res) => {
  res.send("✅ ToolSwap backend is running...");
});

// ------------------- AUTH ROUTES -------------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, location, phone } = req.body;
    const existingUser = await userModel.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userModel.create({ name, email, password: hashedPassword, location, phone });

    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id)
      .populate("toolsRequested.tool")
      .populate("toolsLentOut.tool")
      .populate("toolsLentOut.borrower");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/tools", async (req, res) => {
  try {
    const tools = await toolModel.find({ available: true })
      .populate("owner", "phone rating numReviews name location profileImage");
    res.json(tools);
  } catch (error) {
    console.error("Error fetching tools:", error);
    res.status(500).json({ message: "Error fetching tools" });
  }
});

// ------------------- SERVER -------------------
server.listen(3000, () => {
  console.log("🚀 Server started on port 3000");
});
