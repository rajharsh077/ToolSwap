const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    // Context of the chat (which tool was being discussed)
    tool: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tool',
    }
});

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    tool: { // Tool that initiated the conversation
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tool',
    },
    messages: [messageSchema],
    lastMessageAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);