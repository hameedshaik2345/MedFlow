
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

console.log("Checking MongoDB connection...");
console.log("URI:", process.env.MONGO_URI);

mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    console.log("SUCCESS: Connected to MongoDB");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAILURE: Could not connect to MongoDB");
    console.error(err);
    process.exit(1);
  });
