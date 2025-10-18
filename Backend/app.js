const express=require('express');
const app=express();
const http = require('http'); 
const server = http.createServer(app); 
const { Server } = require("socket.io"); 
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", 
        methods: ["GET", "POST"]
    }
});
app.use(express.json());
app.use(express.urlencoded({extended:true}));
const dbConnection=require("./config/db");
dbConnection();
const cors=require('cors');
app.use(cors());
const bcrypt=require('bcrypt');
const jwt=require("jsonwebtoken");
const userModel=require("./models/users");
const toolModel=require("./models/tool");
const Conversation = require("./models/chat");
require("dotenv").config();
const { generateToken } = require("./middlewares/AuthMiddleware");
const {authenticateToken} = require("./middlewares/AuthMiddleware");
const userRoute=require("./routes/userRoute");
const toolRoute=require("./routes/toolsRoute");
const chatRoute = require("./routes/chatRoute");

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 1. User joins their own room (identified by their userId)
    socket.on('join_room', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room ${userId}`);
    });

    // 2. Handle sending a message
    socket.on('send_message', async (data) => {
        const { senderId, receiverId, message, conversationId, toolId, senderName } = data;
        
        // 1. Save message to MongoDB
        try {
            const conversation = await Conversation.findById(conversationId);
            if (conversation) {
                const newMessage = {
                    sender: senderId,
                    message: message,
                    tool: toolId,
                };
                conversation.messages.push(newMessage);
                conversation.lastMessageAt = new Date();
                await conversation.save();

                // Get the ID of the saved message
                const savedMessage = conversation.messages[conversation.messages.length - 1];

                // 2. Prepare data for real-time broadcast
                const broadcastData = {
                    ...data,
                    _id: savedMessage._id, // Add the ID for keying on the frontend
                    timestamp: savedMessage.timestamp,
                    senderName: senderName // Pass sender name for display
                };

                // ✅ FIX: ONLY emit to the RECEIVER's room. The sender handles their own UI update.
                io.to(receiverId).emit('receive_message', broadcastData);
            }
        } catch (error) {
            console.error("Error saving message in socket handler:", error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.use("/:name/",userRoute);
app.use("/tools/",toolRoute);
app.use("/chat", authenticateToken, chatRoute);


app.get("/",(req,res)=>{
    res.send("hii");
})


app.post("/signup", async (req, res) => {
    try {
        const { name, email, password, location, phone } = req.body;

        const existingUser = await userModel.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            name,
            email,
            password: hashedPassword,
            location,
            phone
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

        const user = await userModel.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        // Generate JWT
        const token = generateToken(user);

        // Send response
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                location: user.location,
                phone: user.phone
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


app.get("/me",authenticateToken,async(req,res)=>{
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
})


app.get("/tools", async (req, res) => {
  try {
    const tools = await toolModel.find({ available: true }).populate("owner", "phone rating numReviews name location profileImage");
    return res.json(tools);
  } catch (error) {
    console.error("Error fetching tools:", error);
    res.status(500).json({ message: "Error fetching tools" });
  }
});

server.listen(3000,()=>{
    console.log("Server Started");
})
