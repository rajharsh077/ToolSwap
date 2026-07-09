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

    let parsedLocation;
    if (typeof location === "string") {
      parsedLocation = { lat: 28.6139, lng: 77.209, address: location };
    } else if (location) {
      parsedLocation = {
        lat: location.lat != null ? location.lat : 28.6139,
        lng: location.lng != null ? location.lng : 77.209,
        address: location.address || "Location provided"
      };
    } else {
      parsedLocation = { lat: 28.6139, lng: 77.209, address: "Location provided" };
    }

    const newTool = new toolModel({
      title,
      description,
      category,
      image,
      location: parsedLocation,
      condition: req.body.condition || "Good Condition",
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
        const user = await userModel.findById(req.params.userId)
            .populate("toolsOwned")
            .populate({
                path: "toolsLentOut.tool",
                select: "title image"
            })
            .populate({
                path: "toolsLentOut.borrower",
                select: "name profileImage"
            })
            .populate({
                path: "toolsRequested.tool",
                select: "title image owner",
                populate: {
                    path: "owner",
                    select: "name profileImage"
                }
            });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const lendsCount = user.toolsLentOut 
            ? user.toolsLentOut.filter(t => t.status === "approved" || t.status === "returned").length 
            : 0;

        const borrowsCount = user.toolsRequested
            ? user.toolsRequested.filter(t => t.status === "approved" || t.status === "returned").length 
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
            borrowsCount,
            toolsOwned: user.toolsOwned, // Array of populated tool documents
            toolsLentOut: user.toolsLentOut,
            toolsRequested: user.toolsRequested
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

// --- Admin Middleware ---
const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

// -------------------- Admin Stats --------------------
// Path: /admin/stats (accessed via /user/admin/stats)
router.get("/admin/stats", authenticateToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await userModel.countDocuments();
    const totalTools = await toolModel.countDocuments();
    const activeLoans = await toolModel.countDocuments({ borrowedBy: { $ne: null } });
    const flaggedTools = await toolModel.countDocuments({ isFlagged: true });

    res.json({
      totalUsers,
      totalTools,
      activeLoans,
      flaggedTools
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: "Failed to fetch admin stats" });
  }
});

// -------------------- Admin Analytics --------------------
// Path: /admin/analytics (accessed via /user/admin/analytics)
router.get("/admin/analytics", authenticateToken, isAdmin, async (req, res) => {
  try {
    const newUsers = Array(7).fill(0);
    const loans = Array(7).fill(0);
    const reports = Array(7).fill(0);
    const flaggedItems = Array(7).fill(0);
    const labels = [];

    const today = new Date();
    
    // Generate dates and count statistics for each of the last 7 days
    for (let i = 6; i >= 0; i--) {
      const startOfDay = new Date();
      startOfDay.setDate(today.getDate() - i);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setDate(today.getDate() - i);
      endOfDay.setHours(23, 59, 59, 999);

      // Add label for this day
      labels.push(startOfDay.toLocaleDateString("en-US", { weekday: "short" }));

      const index = 6 - i;

      // Query database for counts on this specific day
      newUsers[index] = await userModel.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      loans[index] = await toolModel.countDocuments({
        borrowedAt: { $gte: startOfDay, $lte: endOfDay }
      });

      reports[index] = await toolModel.countDocuments({
        flaggedAt: { $gte: startOfDay, $lte: endOfDay }
      });

      flaggedItems[index] = await toolModel.countDocuments({
        borrowerFlaggedAt: { $gte: startOfDay, $lte: endOfDay }
      });
    }

    res.json({
      newUsers,
      loans,
      reports,
      flaggedItems,
      labels
    });
  } catch (err) {
    console.error("Error generating admin analytics:", err);
    res.status(500).json({ message: "Failed to generate analytics" });
  }
});

// -------------------- Get All Users --------------------
// Path: /admin/users (accessed via /user/admin/users)
router.get("/admin/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await userModel.find({})
      .select("-password")
      .populate({
        path: "toolsRequested.tool",
        populate: {
          path: "owner",
          select: "name email"
        }
      })
      .populate("toolsLentOut.tool")
      .populate("toolsLentOut.borrower", "name email");
    res.json(users);
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// -------------------- Verify User --------------------
// Path: /admin/verify/:userId (accessed via /user/admin/verify/:userId)
router.put("/admin/verify/:userId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isVerified } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isVerified = isVerified;
    if (!user.notifications) user.notifications = [];
    
    user.notifications.push({
      title: isVerified ? "Profile Verified 🛡️" : "Profile Unverified",
      message: isVerified 
        ? "Congratulations! Your profile has been verified by the administrator."
        : "Your verification status has been removed by the administrator.",
      type: isVerified ? "success" : "info",
      createdAt: new Date()
    });

    await user.save();
    res.json({ message: "User verification status updated", user });
  } catch (err) {
    console.error("Error verifying user:", err);
    res.status(500).json({ message: "Failed to update user verification" });
  }
});

// -------------------- Ban/Suspend User --------------------
// Path: /admin/user/:userId (accessed via /user/admin/user/:userId)
router.put("/admin/user/:userId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (action === "suspend") {
      user.isSuspended = true;
    } else if (action === "unsuspend") {
      user.isSuspended = false;
    } else if (action === "ban") {
      user.isBanned = true;
    } else if (action === "unban") {
      user.isBanned = false;
    } else {
      return res.status(400).json({ message: "Invalid action type" });
    }

    if (!user.notifications) user.notifications = [];

    let notifTitle = "";
    let notifMsg = "";
    if (action === "suspend") {
      notifTitle = "Account Suspended ⚠️";
      notifMsg = "Your account has been suspended by the administrator due to policy violations.";
    } else if (action === "unsuspend") {
      notifTitle = "Account Restored ✅";
      notifMsg = "Your account suspension has been lifted by the administrator. Welcome back!";
    } else if (action === "ban") {
      notifTitle = "Account Banned 🛑";
      notifMsg = "Your account has been permanently banned from the platform.";
    } else if (action === "unban") {
      notifTitle = "Account Re-activated";
      notifMsg = "Your account ban has been lifted by the administrator.";
    }

    if (notifTitle) {
      user.notifications.push({
        title: notifTitle,
        message: notifMsg,
        type: "warning",
        createdAt: new Date()
      });
    }

    await user.save();
    res.json({ message: `User successfully ${action}ed`, user });
  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ message: "Failed to update user status" });
  }
});

// -------------------- Get Notifications --------------------
// Path: /notifications (accessed via /user/notifications)
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.notifications || []);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// -------------------- Mark Notifications as Read --------------------
// Path: /notifications/read (accessed via /user/notifications/read)
router.put("/notifications/read", authenticateToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.notifications) {
      user.notifications.forEach((n) => {
        n.isRead = true;
      });
      await user.save();
    }

    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    console.error("Error marking notifications read:", err);
    res.status(500).json({ message: "Failed to mark notifications read" });
  }
});

// -------------------- Admin Broadcast Announcement --------------------
// Path: /admin/broadcast (accessed via /user/admin/broadcast)
router.post("/admin/broadcast", authenticateToken, async (req, res) => {
  try {
    // Verify admin role
    const adminUser = await userModel.findById(req.user.id);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admin authorization required." });
    }

    const { title, message, target } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required." });
    }

    const query = { isAdmin: { $ne: true } };
    if (target === "verified") {
      query.isVerified = true;
    } else if (target === "suspended") {
      query.isSuspended = true;
    }

    const notificationPayload = {
      title,
      message,
      type: "announcement",
      isRead: false,
      createdAt: new Date()
    };

    const updateResult = await userModel.updateMany(query, {
      $push: { notifications: notificationPayload }
    });

    res.json({ 
      message: `Announcement broadcast successfully to ${target} users.`,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });
  } catch (err) {
    console.error("Error broadcasting announcement:", err);
    res.status(500).json({ message: "Failed to broadcast announcement" });
  }
});

module.exports = router;