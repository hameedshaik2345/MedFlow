"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log("Checking MongoDB connection...");
console.log("URI:", process.env.MONGO_URI);
mongoose_1.default
    .connect(process.env.MONGO_URI)
    .then(() => {
    console.log("SUCCESS: Connected to MongoDB");
    process.exit(0);
})
    .catch((err) => {
    console.error("FAILURE: Could not connect to MongoDB");
    console.error(err);
    process.exit(1);
});
