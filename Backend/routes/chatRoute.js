const express = require("express");
const router = express.Router();
const Conversation = require("../models/chat");
const { authenticateToken } = require("../middlewares/AuthMiddleware");

// -------------------- Get all conversations for a user --------------------
router.get("/conversations", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const conversations = await Conversation.find({
            participants: userId,
        })
        .populate("participants", "name email profileImage location rating numReviews")
        .populate("tool", "title image")
        .populate({ // ⬅️ NEW: Populate the sender for the messages
            path: 'messages.sender',
            model: 'User',
            select: 'name' // Only need the name for display
        })
        .sort({ lastMessageAt: -1 }); // Sort by latest activity

        res.json(conversations);
    } catch (err) {
        // Log the actual error object for better debugging
        console.error("Critical Error fetching conversations:", err); 
        res.status(500).json({ message: "Server error fetching conversations", details: err.message });
    }
});

// -------------------- Get or create a specific conversation --------------------
router.get("/:toolId/:otherUserId", authenticateToken, async (req, res) => {
    try {
        const { toolId, otherUserId } = req.params;
        const currentUserId = req.user.id;
        
        // Find existing conversation related to this specific tool
        let conversation = await Conversation.findOne({
            tool: toolId,
            participants: { $all: [currentUserId, otherUserId] }
        })
        .populate("participants", "name profileImage location rating numReviews")
        .populate("tool", "title")
        .populate({ // ⬅️ NEW: Populate the sender for messages history
            path: 'messages.sender',
            model: 'User',
            select: 'name' 
        });

        if (!conversation) {
            // Create a new conversation
            conversation = await Conversation.create({
                participants: [currentUserId, otherUserId],
                tool: toolId,
                messages: [],
                lastMessageAt: new Date(), // Initialize last message date
            });

            // Re-populate for the response
            conversation = await Conversation.findById(conversation._id)
                .populate("participants", "name profileImage")
                .populate("tool", "title")
                .populate({ // Ensure new conversation is fully populated
                    path: 'messages.sender',
                    model: 'User',
                    select: 'name'
                });
        }

        res.json(conversation);
    } catch (err) {
        console.error("Error fetching/creating conversation:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// -------------------- Save a new message (API endpoint for Socket.io fallback/history) --------------------
router.post("/message", authenticateToken, async (req, res) => {
    try {
        const { conversationId, message, toolId } = req.body;
        const sender = req.user.id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        // Add the new message to the conversation
        conversation.messages.push({
            sender: sender,
            message: message,
            tool: toolId,
        });

        conversation.lastMessageAt = new Date();
        await conversation.save();

        res.status(201).json(conversation.messages[conversation.messages.length - 1]);
    } catch (err) {
        console.error("Error saving message:", err);
        res.status(500).json({ message: "Server error saving message" });
    }
});

// -------------------- Mark messages in a conversation as read --------------------
router.put("/:conversationId/read", authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const currentUserId = req.user.id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        // Check if the current user is a participant
        if (!conversation.participants.some(p => p.toString() === currentUserId)) {
            return res.status(403).json({ message: "Not authorized to access this conversation" });
        }

        // Mark messages not sent by current user as read
        let updated = false;
        conversation.messages.forEach(msg => {
            const senderId = msg.sender?._id || msg.sender;
            if (senderId && senderId.toString() !== currentUserId && !msg.isRead) {
                msg.isRead = true;
                updated = true;
            }
        });

        if (updated) {
            await conversation.save();
        }

        res.json({ message: "Messages marked as read" });
    } catch (err) {
        console.error("Error marking messages read:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
