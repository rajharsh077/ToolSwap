const express = require("express");
const router = express.Router({ mergeParams: true });
const toolModel = require("../models/tool");
const userModel = require("../models/users");
const { authenticateToken, generateToken } = require("../middlewares/AuthMiddleware");

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
    const paramUsername = req.params.user;

    if (!tokenUsername || !paramUsername || tokenUsername.toLowerCase() !== decodeURIComponent(paramUsername).toLowerCase()) {
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
        
        const lendsCount = user.toolsLentOut 
            ? user.toolsLentOut.filter(t => t.status === "approved" || t.status === "returned").length 
            : 0;

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            location: user.location,
            phone: user.phone,
            profileImage: user.profileImage,
            isVerified: user.isVerified,
            rating: user.rating || 0,
            numReviews: user.numReviews || 0,
            lendsCount,
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

// -------------------- 🛠 Update Profile --------------------
const handleProfileUpdate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, location, phone, profileImage } = req.body;

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (location) user.location = location;
    if (phone) user.phone = phone;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();
    const token = generateToken(user);

    res.status(200).json({
      message: "Profile updated successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        phone: user.phone,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        profileImage: user.profileImage
      }
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Failed to update profile." });
  }
};

router.put("/profile", authenticateToken, handleProfileUpdate);
router.put("/edit/profile", authenticateToken, handleProfileUpdate);

// -------------------- 🛠 Retrieve Profile Details --------------------
const handleProfileGet = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    console.error("Error retrieving profile:", err);
    res.status(500).json({ message: "Failed to load profile." });
  }
};

router.get("/profile", authenticateToken, handleProfileGet);
router.get("/edit/profile", authenticateToken, handleProfileGet);

// -------------------- Rate a User (Lender) --------------------
// Path: /user/rate/:ownerId
router.post("/rate/:ownerId", authenticateToken, async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Invalid rating value (must be 1-5)" });
    }

    const owner = await userModel.findById(ownerId);
    if (!owner) return res.status(404).json({ message: "User not found" });

    // Calculate new average rating
    const currentRatingTotal = (owner.rating || 0) * (owner.numReviews || 0);
    const newNumReviews = (owner.numReviews || 0) + 1;
    const newRating = (currentRatingTotal + rating) / newNumReviews;

    owner.rating = parseFloat(newRating.toFixed(2));
    owner.numReviews = newNumReviews;
    await owner.save();

    res.status(200).json({ message: "Rating submitted successfully!", rating: owner.rating, numReviews: owner.numReviews });
  } catch (err) {
    console.error("Error rating user:", err);
    res.status(500).json({ message: "Failed to submit rating" });
  }
});

module.exports=router;