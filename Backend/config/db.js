const mongoose=require('mongoose');
const dbConnection=async()=>{
    try {
        await mongoose.connect("mongodb://localhost:27017/ToolSwap");
        console.log("Database connected");
    } catch (error) {
        console.log("Error connecting database");
        console.log("Error");
    }

}
module.exports=dbConnection;