const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("Critical MongoDB Connection Failure:");
    console.error(`- Message: ${err.message}`);
    console.error(`- Code: ${err.code || 'N/A'}`);
    console.error("Please check your network connection and .env MONGO_URI.");
    process.exit(1);
  }
};

module.exports = connectDB;
