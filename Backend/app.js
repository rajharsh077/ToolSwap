const express=require('express');
const app=express();
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
require("dotenv").config();
const { generateToken } = require("./middlewares/AuthMiddleware");
const {authenticateToken} = require("./middlewares/AuthMiddleware");
const userRoute=require("./routes/userRoute");
const toolRoute=require("./routes/toolsRoute");

app.use("/:name/",userRoute);
app.use("/tools/",toolRoute);


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
    const user = await userModel.findById(req.user.userId)
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

app.listen(3000,()=>{
    console.log("Server Started");
})


