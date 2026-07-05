const mongoose = require("mongoose");
const mongoUrl = "mongodb://localhost:27017/ToolSwap";

mongoose.connect(mongoUrl)
  .then(async () => {
    const users = await mongoose.connection.db.collection("users").find({}).toArray();
    console.log("USERS_LIST:" + JSON.stringify(users.map(u => ({ name: u.name, email: u.email, isVerified: u.isVerified }))));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
