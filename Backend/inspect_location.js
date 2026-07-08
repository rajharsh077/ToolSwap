const mongoose = require("mongoose");
const mongoUrl = "mongodb://localhost:27017/ToolSwap";

mongoose.connect(mongoUrl)
  .then(async () => {
    const tools = await mongoose.connection.db.collection("tools").find({}).toArray();
    console.log("=== TOOLS LOCATION ===");
    for (let tool of tools) {
      console.log(`Tool: ${tool.title} (${tool._id})`);
      console.log(`  location:`, JSON.stringify(tool.location));
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
