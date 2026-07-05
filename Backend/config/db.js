const mongoose = require('mongoose');
require('dotenv').config();

const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ToolSwap");
        console.log("Database connected");
    } catch (error) {
        console.error("Error connecting database", error.message);
    }
};

module.exports = dbConnection;