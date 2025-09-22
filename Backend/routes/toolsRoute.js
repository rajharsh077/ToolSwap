const express = require("express");
const router = express.Router();
const Tool = require("../models/tool");
const User = require("../models/users");
const { authenticateToken } = require("../middlewares/AuthMiddleware");

// -------------------- Get tools borrowed by user --------------------
router.get("/borrowed/:userId", authenticateToken, async (req, res) => {
  try {
    const tools = await Tool.find({ borrowedBy: req.params.userId });
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
      .filter((t) => t.status === "pending")
      .map((t) => ({
        _id: t._id,
        toolId: t.tool._id,
        toolTitle: t.tool.title,
        borrowerId: t.borrower._id,
        borrowerName: t.borrower.name,
        status: t.status,
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

    const owner = await User.findById(req.user.id);
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    const borrower = await User.findById(borrowerId);
    if (!borrower) return res.status(404).json({ message: "Borrower not found" });

    const toolEntryOwner = owner.toolsLentOut.find(t => t.tool.toString() === toolId && t.borrower.toString() === borrowerId);
    if (!toolEntryOwner) return res.status(404).json({ message: "Tool request not found for owner" });

    const toolEntryBorrower = borrower.toolsRequested.find(t => t.tool.toString() === toolId);
    if (!toolEntryBorrower) return res.status(404).json({ message: "Tool request not found for borrower" });

    toolEntryOwner.status = status;
    toolEntryBorrower.status = status;

    await owner.save();
    await borrower.save();

    if (status === "approved") {
      await Tool.findByIdAndUpdate(toolId, { available: false, borrowedBy: borrowerId });
    }

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
    if (tool.owner.toString() !== req.user.id) return res.status(403).json({ message: "You are not authorized to delete this tool." });

    await Tool.findByIdAndDelete(toolId);
    await User.findByIdAndUpdate(req.user.id, { $pull: { toolsOwned: toolId } });

    res.status(200).json({ message: "Tool deleted successfully." });
  } catch (err) {
    console.error("Error deleting tool:", err);
    res.status(500).json({ message: "Server error while deleting tool." });
  }
});

// router.post("/return/:toolId",authenticateToken,async(req,res)=>{

// })

module.exports = router;
