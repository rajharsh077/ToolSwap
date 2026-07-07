const express = require("express");
const router = express.Router();
const Tool = require("../models/tool");
const User = require("../models/users");
const { authenticateToken } = require("../middlewares/AuthMiddleware");
const sendMail=require("../utils/mailer");

// -------------------- Get tools borrowed by user --------------------
router.get("/borrowed/:userId", authenticateToken, async (req, res) => {
  try {
    const tools = await Tool.find({ borrowedBy: req.params.userId, available: false }).populate('owner');
    res.json(tools);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching borrowed tools" });
  }
});

// -------------------- Get lend requests for user's tools --------------------
router.get("/requests/:userId", authenticateToken, async (req, res) => {
  try {
    const owner = await User.findById(req.params.userId)
      .populate({
        path: "toolsLentOut.tool",
        model: "Tool",
      })
      .populate({
        path: "toolsLentOut.borrower",
        model: "User",
      });

    const requests = owner.toolsLentOut
      .filter((t) => t.status === "pending" && t.tool && t.borrower)
      .map((t) => ({
        _id: t._id,
        toolId: t.tool._id,
        toolTitle: t.tool.title,
        toolImage: t.tool.image,
        borrowerId: t.borrower._id,
        borrowerName: t.borrower.name,
        borrowerPhone: t.borrower.phone,
        borrowerImage: t.borrower.profileImage,
        borrowerRating: t.borrower.rating || 5,
        status: t.status,
        createdAt: t.lendDate || new Date()
      }));

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching requests" });
  }
});

// -------------------- Send borrow request --------------------
router.post("/request/:toolId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const toolId = req.params.toolId;

    const tool = await Tool.findById(toolId).populate("owner");
    if (!tool) return res.status(404).json({ message: "Tool not found" });
    if (!tool.available) return res.status(400).json({ message: "Tool not available" });

    const borrower = await User.findById(userId);

    // Prevent duplicate requests
    const existingRequest = borrower.toolsRequested.find(
      (t) => t.tool.toString() === toolId && t.status === "pending"
    );
    if (existingRequest) return res.status(400).json({ message: "You already requested this tool." });

    borrower.toolsRequested.push({
      tool: tool._id,
      status: "pending",
      requestDate: new Date(),
    });
    await borrower.save();

    const owner = await User.findById(tool.owner._id);
    owner.toolsLentOut.push({
      tool: tool._id,
      borrower: borrower._id,
      status: "pending",
      lendDate: new Date(),
    });
    await owner.save();

     sendMail({
      to: owner.email,
      subject: `New Borrow Request for "${tool.title}"`,
      text: `${borrower.name} has requested to borrow your tool "${tool.title}".`,
      html: `<p><strong>${borrower.name}</strong> has requested to borrow your tool <strong>${tool.title}</strong>.</p>`,
    })
    .then(() => console.log(`Email sent to ${owner.email}`))
    .catch((err) => console.error("Error sending email:", err));
    res.status(200).json({ message: "Borrow request sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- Approve or Reject a borrow request --------------------
router.put("/request/:toolId/:borrowerId", authenticateToken, async (req, res) => {
  try {
    const { toolId, borrowerId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) return res.status(404).json({ message: "Tool not found" });

    const owner = await User.findById(req.user.id);
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    const borrower = await User.findById(borrowerId);
    if (!borrower) return res.status(404).json({ message: "Borrower not found" });

    const toolEntryOwner = owner.toolsLentOut.find(
      (t) => t.tool.toString() === toolId && t.borrower.toString() === borrowerId
    );
    if (!toolEntryOwner) return res.status(404).json({ message: "Tool request not found for owner" });

    const toolEntryBorrower = borrower.toolsRequested.find((t) => t.tool.toString() === toolId);
    if (!toolEntryBorrower) return res.status(404).json({ message: "Tool request not found for borrower" });

    if (status === "approved") {
      toolEntryOwner.status = "approved";
      toolEntryBorrower.status = "approved";

      await Tool.findByIdAndUpdate(toolId, {
        available: false,
        borrowedBy: borrowerId,
        borrowedAt: new Date(),
      });

      if (!borrower.notifications) borrower.notifications = [];
      borrower.notifications.push({
        title: "Request Approved! 🎉",
        message: `Your request to borrow "${tool.title}" has been approved by the lender.`,
        type: "success",
        createdAt: new Date()
      });

      sendMail({
        to: borrower.email,
        subject: `Your Borrow Request for "${tool.title}" is Approved`,
        text: `Your request to borrow "${tool.title}" has been approved!`,
      })
      .then(() => console.log(`Approval email sent to ${borrower.email}`))
      .catch(err => console.error("Error sending approval email:", err));

      sendMail({
        to: owner.email,
        subject: `You have successfully lent "${tool.title}"`,
        text: `You have successfully lent your tool "${tool.title}" to ${borrower.name}.`,
      })
      .then(() => console.log(`Lent-success email sent to owner: ${owner.email}`))
      .catch(err => console.error("Error sending email to owner:", err));
    } else if (status === "rejected") {
      // Remove rejected request from both owner and borrower
      owner.toolsLentOut = owner.toolsLentOut.filter(
        (t) => !(t.tool.toString() === toolId && t.borrower.toString() === borrowerId)
      );
      borrower.toolsRequested = borrower.toolsRequested.filter((t) => t.tool.toString() !== toolId);

      if (!borrower.notifications) borrower.notifications = [];
      borrower.notifications.push({
        title: "Request Rejected ❌",
        message: `Your request to borrow "${tool.title}" was rejected by the owner.`,
        type: "error",
        createdAt: new Date()
      });
    }
      sendMail({
        to: borrower.email,
        subject: `Your Borrow Request for "${tool.title}" is Rejected`,
        text: `Sorry, your request to borrow "${tool.title}" has been rejected.`,
      })
      .then(() => console.log(`Rejection email sent to ${borrower.email}`))
      .catch(err => console.error("Error sending rejection email:", err));

    await owner.save();
    await borrower.save();

    res.status(200).json({ message: `Request ${status}` });
  } catch (err) {
    console.error("Error in /tools/request PUT:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- Update a tool's availability --------------------
router.put("/:toolId", authenticateToken, async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(req.params.toolId, req.body, { new: true });
    res.json(tool);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update tool." });
  }
});

// -------------------- Delete a tool --------------------
router.delete("/:toolId", authenticateToken, async (req, res) => {
  try {
    const { toolId } = req.params;
    const tool = await Tool.findById(toolId);
    if (!tool) return res.status(404).json({ message: "Tool not found." });
    if (tool.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "You are not authorized to delete this tool." });

    await Tool.findByIdAndDelete(toolId);

    // Remove from owner's toolsOwned
    await User.findByIdAndUpdate(req.user.id, { $pull: { toolsOwned: toolId } });

    // Clean up any pending requests in other users
    await User.updateMany(
      {},
      { $pull: { toolsRequested: { tool: toolId }, toolsLentOut: { tool: toolId } } }
    );

    res.status(200).json({ message: "Tool deleted successfully." });
  } catch (err) {
    console.error("Error deleting tool:", err);
    res.status(500).json({ message: "Server error while deleting tool." });
  }
});

// -------------------- Request to return a tool --------------------
router.post("/return/:toolId", authenticateToken, async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.toolId);
    if (!tool) return res.status(404).json({ message: "Tool not found" });
    if (tool.borrowedBy?.toString() !== req.user.id)
      return res.status(403).json({ message: "Not your borrowed tool" });

    tool.returnRequested = true;
    await tool.save();

    const owner = await User.findById(tool.owner);
    if (owner) {
      if (!owner.notifications) owner.notifications = [];
      owner.notifications.push({
        title: "Return Requested 🔄",
        message: `The borrower has requested to return your tool: "${tool.title}". Please confirm return receipt.`,
        type: "info",
        createdAt: new Date()
      });
      await owner.save();
    }

    res.status(200).json({ message: "Return request sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- Get tool detail by ID --------------------
router.get("/detail/:toolId", async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.toolId)
      .populate("owner", "name email phone rating numReviews isVerified profileImage")
      .populate({
        path: "reviews.borrower",
        model: "User",
        select: "name profileImage"
      });
    if (!tool) return res.status(404).json({ message: "Tool not found" });
    res.json(tool);
  } catch (err) {
    console.error("Error fetching tool detail:", err);
    res.status(500).json({ message: "Error fetching tool details" });
  }
});

// -------------------- Get Leaderboard --------------------
router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find({ isAdmin: { $ne: true }, isBanned: { $ne: true } });
    
    const leaderboardData = users.map(user => {
      // 1. Listed tools points (30 points per listed tool)
      const listedToolsCount = user.toolsOwned ? user.toolsOwned.length : 0;
      const listedToolsPoints = listedToolsCount * 30;

      // 2. Lending points (50 points per approved/returned lend)
      const approvedLends = user.toolsLentOut 
        ? user.toolsLentOut.filter(l => ["approved", "returned"].includes(l.status)).length 
        : 0;
      const lendingPoints = approvedLends * 50;

      // 3. Borrowing points (20 points per approved/returned request)
      const approvedBorrows = user.toolsRequested 
        ? user.toolsRequested.filter(b => ["approved", "returned"].includes(b.status)).length 
        : 0;
      const borrowingPoints = approvedBorrows * 20;

      // 4. Rating bonus (Rating * 10)
      const ratingVal = user.rating || 0;
      const ratingBonus = Math.round(ratingVal * 10);

      // 5. Total Score
      const totalScore = listedToolsPoints + lendingPoints + borrowingPoints + ratingBonus;

      return {
        _id: user._id,
        name: user.name,
        profileImage: user.profileImage,
        listedTools: listedToolsCount,
        lendingPoints,
        borrowingPoints,
        ratingBonus,
        totalScore
      };
    });

    // Sort by totalScore descending
    leaderboardData.sort((a, b) => b.totalScore - a.totalScore);

    res.json(leaderboardData);
  } catch (err) {
    console.error("Error generating leaderboard:", err);
    res.status(500).json({ message: "Server error generating leaderboard" });
  }
});

// -------------------- Confirm tool return (Owner action) --------------------
router.put("/return/:toolId/confirm", authenticateToken, async (req, res) => {
  try {
    const toolId = req.params.toolId;
    const tool = await Tool.findById(toolId);
    if (!tool) return res.status(404).json({ message: "Tool not found" });
    
    if (tool.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to confirm return for this tool" });
    }

    const borrowerId = tool.borrowedBy;

    // Reset tool fields
    tool.available = true;
    tool.borrowedBy = null;
    tool.returnRequested = false;
    await tool.save();

    // Update status in owner's toolsLentOut
    if (borrowerId) {
      await User.updateOne(
        { _id: req.user.id, "toolsLentOut.tool": toolId, "toolsLentOut.borrower": borrowerId },
        { $set: { "toolsLentOut.$.status": "returned" } }
      );
      
      // Update status in borrower's toolsRequested
      await User.updateOne(
        { _id: borrowerId, "toolsRequested.tool": toolId },
        { $set: { "toolsRequested.$.status": "returned" } }
      );

      const borrowerUser = await User.findById(borrowerId);
      if (borrowerUser) {
        if (!borrowerUser.notifications) borrowerUser.notifications = [];
        borrowerUser.notifications.push({
          title: "Return Confirmed! 🙌",
          message: `The return of "${tool.title}" has been confirmed by the lender. Thank you!`,
          type: "success",
          createdAt: new Date()
        });
        await borrowerUser.save();
      }
    }

    res.status(200).json({ message: "Return confirmed successfully" });
  } catch (err) {
    console.error("Error in return confirm:", err);
    res.status(500).json({ message: "Server error confirming return" });
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

// -------------------- Get Flagged Tools --------------------
// Path: /flagged
router.get("/flagged", authenticateToken, isAdmin, async (req, res) => {
  try {
    const flaggedTools = await Tool.find({ isFlagged: true })
      .populate("owner", "name email")
      .populate("flaggedBy", "name email");
    res.json(flaggedTools);
  } catch (err) {
    console.error("Error fetching flagged tools:", err);
    res.status(500).json({ message: "Failed to fetch flagged tools" });
  }
});

// -------------------- Get Flagged Borrowers --------------------
// Path: /flaggedBorrowers
router.get("/flaggedBorrowers", authenticateToken, isAdmin, async (req, res) => {
  try {
    const flaggedBorrowers = await Tool.find({ borrowerFlagged: true })
      .populate("borrowedBy", "name email warnCount isBanned")
      .populate("reportedBorrower", "name email warnCount isBanned")
      .populate("borrowerFlaggedBy", "name email");
    res.json(flaggedBorrowers);
  } catch (err) {
    console.error("Error fetching flagged borrowers:", err);
    res.status(500).json({ message: "Failed to fetch flagged borrowers" });
  }
});

// -------------------- Moderate Tool --------------------
// Path: /moderate/:toolId
router.put("/moderate/:toolId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { toolId } = req.params;
    const { action } = req.body; // 'approve' (clear flag) or 'reject' (remove tool)

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({ message: "Tool not found" });
    }

    if (action === "approve") {
      tool.isFlagged = false;
      tool.flaggedBy = null;
      tool.flagReason = "";
      tool.flaggedAt = null;
      await tool.save();
      return res.json({ message: "Tool approved (flags cleared)", tool });
    } else if (action === "reject") {
      const ownerId = tool.owner;

      // Delete the tool
      await Tool.findByIdAndDelete(toolId);

      // Remove from owner's toolsOwned
      await User.findByIdAndUpdate(ownerId, { $pull: { toolsOwned: toolId } });

      // Clean up requests
      await User.updateMany(
        {},
        { $pull: { toolsRequested: { tool: toolId }, toolsLentOut: { tool: toolId } } }
      );

      return res.json({ message: "Tool rejected and removed from platform" });
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    console.error("Error moderating tool:", err);
    res.status(500).json({ message: "Failed to moderate tool" });
  }
});

// -------------------- Moderate Borrower Report --------------------
// Path: /borrower/moderate/:toolId
router.put("/borrower/moderate/:toolId", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { toolId } = req.params;
    const { action } = req.body; // 'approve' (resolve/clear) or 'warn'

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({ message: "Tool not found" });
    }

    if (action === "approve") {
      tool.borrowerFlagged = false;
      tool.borrowerFlaggedBy = null;
      tool.borrowerFlagReason = "";
      tool.borrowerFlaggedAt = null;
      tool.reportedBorrower = null;
      await tool.save();
      return res.json({ message: "Borrower report resolved and cleared", tool });
    } else if (action === "warn") {
      const targetBorrowerId = tool.reportedBorrower || tool.borrowedBy;
      if (targetBorrowerId) {
        const targetBorrower = await User.findById(targetBorrowerId);
        if (targetBorrower) {
          targetBorrower.warnCount = (targetBorrower.warnCount || 0) + 1;
          if (!targetBorrower.notifications) targetBorrower.notifications = [];
          targetBorrower.notifications.push({
            title: "Formal Warning Issued ⚠️",
            message: `You have received a formal warning regarding the tool: "${tool.title}". Reason: "${tool.borrowerFlagReason || "Problematic return"}"`,
            type: "warning",
            createdAt: new Date()
          });
          await targetBorrower.save();
        }
      }
      tool.borrowerFlagged = false;
      tool.borrowerFlaggedBy = null;
      tool.borrowerFlagReason = "";
      tool.borrowerFlaggedAt = null;
      tool.reportedBorrower = null;
      await tool.save();
      return res.json({ message: "Borrower warned and report cleared successfully", tool });
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    console.error("Error moderating borrower report:", err);
    res.status(500).json({ message: "Failed to moderate borrower report" });
  }
});

// -------------------- Report/Flag a Tool listing (User action) --------------------
// Path: /report/:toolId (accessed via /tools/report/:toolId)
router.post("/report/:toolId", authenticateToken, async (req, res) => {
  try {
    const { toolId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Please provide a reason for flagging this listing" });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) return res.status(404).json({ message: "Tool listing not found" });

    tool.isFlagged = true;
    tool.flaggedBy = req.user.id;
    tool.flagReason = reason.trim();
    tool.flaggedAt = new Date();

    await tool.save();
    res.status(200).json({ message: "Listing flagged for review successfully" });
  } catch (err) {
    console.error("Error flagging tool listing:", err);
    res.status(500).json({ message: "Failed to flag listing" });
  }
});

// -------------------- Report/Flag a Borrower (Owner action) --------------------
// Path: /borrower/report/:toolId (accessed via /tools/borrower/report/:toolId)
router.post("/borrower/report/:toolId", authenticateToken, async (req, res) => {
  try {
    const { toolId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Please provide a reason for reporting the borrower" });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) return res.status(404).json({ message: "Tool not found" });

    // Validate that the requester is the owner of the tool
    if (tool.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to report the borrower for this tool" });
    }

    // Verify there is a current borrower to flag
    if (!tool.borrowedBy) {
      return res.status(400).json({ message: "This tool is not currently borrowed" });
    }

    tool.borrowerFlagged = true;
    tool.borrowerFlaggedBy = req.user.id;
    tool.borrowerFlagReason = reason.trim();
    tool.borrowerFlaggedAt = new Date();
    tool.reportedBorrower = tool.borrowedBy;

    await tool.save();
    res.status(200).json({ message: "Borrower reported successfully" });
  } catch (err) {
    console.error("Error reporting borrower:", err);
    res.status(500).json({ message: "Failed to report borrower" });
  }
});

module.exports = router;
