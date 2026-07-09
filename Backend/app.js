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

const HARD_CODED_ADMIN_EMAIL = "admin@toolswap.com";
const HARD_CODED_ADMIN_PASSWORD = "admin1234";

// Routes
const userRoute = require("./routes/userRoute");
const toolRoute = require("./routes/toolsRoute");
const chatRoute = require("./routes/chatRoute");

dbConnection().then(() => {
  migrateBorrowCount();
});

async function migrateBorrowCount() {
  try {
    const tools = await toolModel.find();
    console.log(`Running borrowCount and properties migration for ${tools.length} tools...`);
    for (let tool of tools) {
      const users = await userModel.find({
        "toolsLentOut.tool": tool._id,
        "toolsLentOut.status": { $in: ["approved", "returned"] }
      });
      
      let count = 0;
      for (let u of users) {
        count += u.toolsLentOut.filter(
          t => t.tool && t.tool.toString() === tool._id.toString() && ["approved", "returned"].includes(t.status)
        ).length;
      }

      const finalCount = Math.max(count, tool.reviews?.length || 0);
      let needsSave = false;

      if (tool.borrowCount === undefined || tool.borrowCount === null || tool.borrowCount !== finalCount) {
        tool.borrowCount = finalCount;
        needsSave = true;
      }

      // Fix location if empty or invalid
      if (!tool.location || (typeof tool.location === "object" && !tool.location.address && !tool.location.lat && !tool.location.lng)) {
        const owner = await userModel.findById(tool.owner);
        if (owner && owner.location) {
          tool.location = { lat: 28.6139, lng: 77.209, address: owner.location };
          needsSave = true;
          console.log(`Copied owner's location "${owner.location}" to tool "${tool.title}"`);
        } else {
          tool.location = { lat: 28.6139, lng: 77.209, address: "Location provided" };
          needsSave = true;
        }
      } else if (typeof tool.location === "string") {
        tool.location = { lat: 28.6139, lng: 77.209, address: tool.location };
        needsSave = true;
      } else {
        if (tool.location.lat == null || tool.location.lng == null) {
          tool.location = {
            lat: tool.location.lat != null ? tool.location.lat : 28.6139,
            lng: tool.location.lng != null ? tool.location.lng : 77.209,
            address: tool.location.address || "Location provided"
          };
          needsSave = true;
        }
      }

      // Fix condition
      if (!tool.condition) {
        tool.condition = "Good Condition";
        needsSave = true;
      }

      if (needsSave) {
        await tool.save();
        console.log(`Updated tool "${tool.title}" (${tool._id}) properties (borrowCount: ${tool.borrowCount}, location: ${JSON.stringify(tool.location)}, condition: ${tool.condition})`);
      }
    }
    console.log("borrowCount and properties migration completed successfully.");
  } catch (err) {
    console.error("Error during borrowCount migration:", err);
  }
}
const allowedOrigins = [
  "http://localhost:5173",
  "https://tool-swap.vercel.app"
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ------------------- SOCKET.IO -------------------
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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
          isRead: false,
        };
        conversation.messages.push(newMessage);
        conversation.lastMessageAt = new Date();
        await conversation.save();

        const savedMessage = conversation.messages[conversation.messages.length - 1];
        const broadcastData = {
          ...data,
          _id: savedMessage._id,
          timestamp: savedMessage.timestamp,
          isRead: false,
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

app.get("/db-status", async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const state = mongoose.connection.readyState;
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    
    let userCount = 0;
    let missingPasswordCount = 0;
    let usersList = [];
    if (state === 1) {
      userCount = await userModel.countDocuments();
      missingPasswordCount = await userModel.countDocuments({ password: { $exists: false } });
      const users = await userModel.find({}, "email isAdmin password");
      usersList = users.map(u => ({
        email: u.email,
        isAdmin: u.isAdmin,
        hasPassword: Boolean(u.password)
      }));
    }

    res.json({
      status: "running",
      database: states[state],
      mongoUriConfigured: Boolean(process.env.MONGO_URI),
      userCount,
      missingPasswordCount,
      users: usersList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------- AUTH ROUTES -------------------
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, location, phone } = req.body;
    const normalizedEmail = (email || "").toLowerCase();
    const existingUser = await userModel.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdminAccount = normalizedEmail === HARD_CODED_ADMIN_EMAIL.toLowerCase() && password === HARD_CODED_ADMIN_PASSWORD;
    const user = await userModel.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      location,
      phone,
      isAdmin: isAdminAccount,
    });

    res.status(201).json({ message: "User registered successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const normalizedEmail = (email || "").toLowerCase();

    let user = await userModel.findOne({ email: normalizedEmail });

    if (normalizedEmail === HARD_CODED_ADMIN_EMAIL.toLowerCase() && password === HARD_CODED_ADMIN_PASSWORD) {
      if (!user) {
        const hashedPassword = await bcrypt.hash(HARD_CODED_ADMIN_PASSWORD, 10);
        user = await userModel.create({
          name: "Admin",
          email: normalizedEmail,
          password: hashedPassword,
          location: "Admin",
          phone: "0000000000",
          isAdmin: true,
        });
      } else {
        let needsSave = false;
        if (!user.isAdmin) {
          user.isAdmin = true;
          needsSave = true;
        }
        if (!user.password) {
          user.password = await bcrypt.hash(HARD_CODED_ADMIN_PASSWORD, 10);
          needsSave = true;
        }
        if (needsSave) {
          await user.save();
        }
      }
    }

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isBanned) return res.status(403).json({ message: "Your account has been banned" });
    if (user.isSuspended) return res.status(403).json({ message: "Your account has been suspended" });

    if (!user.password) {
      return res.status(400).json({ message: "User account password is missing in the database. Please sign up again." });
    }

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
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        isSuspended: user.isSuspended,
        isBanned: user.isBanned,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ 
      message: "Server error", 
      error: err.message, 
      stack: err.stack 
    });
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
      .populate("owner", "phone rating numReviews name location profileImage isVerified");
    res.json(tools);
  } catch (error) {
    console.error("Error fetching tools:", error);
    res.status(500).json({ message: "Error fetching tools" });
  }
});

app.get("/stats", async (req, res) => {
  try {
    const totalUsers = await userModel.countDocuments({ isAdmin: { $ne: true } });
    const availableTools = await toolModel.countDocuments({ available: true, isFlagged: { $ne: true } });
    
    const categories = await toolModel.distinct("category");
    const totalCategories = categories.length;

    // Calculate successful borrows count
    const borrowStats = await userModel.aggregate([
      { $unwind: "$toolsLentOut" },
      { $match: { "toolsLentOut.status": { $in: ["approved", "returned"] } } },
      { $count: "count" }
    ]);
    const successfulBorrows = borrowStats.length > 0 ? borrowStats[0].count : 0;

    res.json({
      totalUsers,
      availableTools,
      totalCategories,
      successfulBorrows
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

app.get("/users/top-lenders", async (req, res) => {
  try {
    const topLenders = await userModel.find({ isSuspended: false, isBanned: false, isAdmin: { $ne: true } })
      .select("name email profileImage rating numReviews toolsLentOut isVerified")
      .sort({ rating: -1 })
      .limit(6);

    const formattedLenders = topLenders.map(user => {
      const successfulLendsCount = user.toolsLentOut.filter(t => t.status === "approved" || t.status === "returned").length;
      return {
        _id: user._id,
        name: user.name,
        profileImage: user.profileImage,
        rating: user.rating || 0,
        numReviews: user.numReviews || 0,
        isVerified: user.isVerified || false,
        lendsCount: successfulLendsCount
      };
    });

    res.json(formattedLenders);
  } catch (error) {
    console.error("Error fetching top lenders:", error);
    res.status(500).json({ message: "Error fetching top lenders" });
  }
});

app.get("/tools/reviews/latest", async (req, res) => {
  try {
    const toolsWithReviews = await toolModel.find({ "reviews.0": { $exists: true } })
      .populate("reviews.borrower", "name profileImage")
      .populate("owner", "name")
      .select("title reviews owner");

    let allReviews = [];
    toolsWithReviews.forEach(tool => {
      tool.reviews.forEach(review => {
        allReviews.push({
          _id: review._id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          borrowerName: review.borrower?.name || "Anonymous User",
          borrowerInitial: review.borrower?.name ? review.borrower.name[0].toUpperCase() : "A",
          toolTitle: tool.title,
          ownerName: tool.owner?.name || "Owner"
        });
      });
    });

    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestReviews = allReviews.slice(0, 6);

    res.json(latestReviews);
  } catch (error) {
    console.error("Error fetching latest reviews:", error);
    res.status(500).json({ message: "Error fetching latest reviews" });
  }
});

// ------------------- SERVER -------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
