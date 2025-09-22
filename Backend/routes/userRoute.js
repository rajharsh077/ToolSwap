const express = require("express");
const router = express.Router({ mergeParams: true });
const toolModel = require("../models/tool");
const userModel = require("../models/users"); // 🔧 Import user model
const { authenticateToken } = require("../middlewares/AuthMiddleware");

// 🛠 Add a new tool
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

    // ✅ Save tool
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

    // ✅ Update user's toolsOwned
    await userModel.findByIdAndUpdate(owner, {
      $push: { toolsOwned: savedTool._id },
    });

    return res.status(201).json({ message: "Tool added successfully!", tool: savedTool });

  } catch (err) {
    console.error("❌ Error in /addTool:", err);
    return res.status(500).json({ message: "Server error while adding tool." });
  }
});



router.get("/:userId", authenticateToken, async (req, res) => {
  const user = await userModel.findById(req.params.userId).populate("toolsOwned");
  res.json(user);
});


router.get("/:userId/lentOut", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find tools owned by this user that are lent out (borrowedBy not null)
    const lentOutTools = await toolModel.find({ owner: userId, borrowedBy: { $ne: null } })
      .populate("borrowedBy", "name phone"); // populate borrower info

    res.status(200).json(lentOutTools);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch lent out tools" });
  }
});

module.exports=router;