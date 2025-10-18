const express = require("express");
const router = express.Router({ mergeParams: true });
const toolModel = require("../models/tool");
const userModel = require("../models/users");
const { authenticateToken } = require("../middlewares/AuthMiddleware");

// -------------------- 🛠 Add a new tool --------------------
// Path: /:name/addTool
router.post("/addTool", authenticateToken, async (req, res) => {
  try {
    const { title, description, category, image, location, available } = req.body;

    if (!title || !description || !category || !image || !location) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    const owner = req.user.id;
    const tokenUsername = req.user.name;
    const paramUsername = req.params.name;

    if (tokenUsername !== paramUsername) {
      return res.status(403).json({ message: "You are not authorized to add tool for this user." });
    }

    const newTool = new toolModel({
      title,
      description,
      category,
      image,
      location,
      owner,
      available: available !== undefined ? available : true,
    });

    const savedTool = await newTool.save();

    await userModel.findByIdAndUpdate(owner, {
      $push: { toolsOwned: savedTool._id },
    });

    return res.status(201).json({ message: "Tool added successfully!", tool: savedTool });

  } catch (err) {
    console.error("❌ Error in /addTool:", err);
    return res.status(500).json({ message: "Server error while adding tool." });
  }
});

// -------------------- ✅ NEW: Get User Profile Data --------------------
// This replaces the conflicting router.get("/:userId") route.
// Path: /:name/profileData
router.get("/profileData/:userId", authenticateToken, async (req, res) => {
    try {
        const user = await userModel.findById(req.params.userId).populate("toolsOwned");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // This is the data the UserProfile page needs for the 'Listed' tab and user info
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            toolsOwned: user.toolsOwned // Array of populated tool documents
        });
    } catch (err) {
        console.error("Error fetching user profile data:", err);
        res.status(500).json({ message: "Server error fetching user profile data" });
    }
});


// -------------------- Get lent out tools --------------------
// Path: /:name/:userId/lentOut
router.get("/:userId/lentOut", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Authorization check: Ensure token user ID matches route user ID
    if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized access to lent out tools" });
    }

    // Find tools owned by this user that are currently lent out
    const lentOutTools = await toolModel.find({ owner: userId, borrowedBy: { $ne: null } })
      .populate("borrowedBy", "name phone"); 

    res.status(200).json(lentOutTools);
  } catch (error) {
    console.error("Error fetching lent out tools:", error);
    res.status(500).json({ message: "Failed to fetch lent out tools" });
  }
});

module.exports=router;