
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user_models';

dotenv.config();

const createHouseholdUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log("Connected to MongoDB");

        const email = "household_user@openbin.com";
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log(`User ${email} already exists.`);
        } else {
            const newUser = new User({
                name: "Household User",
                email: email,
                password: "household_password_123", // You can change this
                role: "student",
                isGoogleAuth: false
            });

            await newUser.save();
            console.log(`✅ Successfully created user: ${email}`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error creating user:", error);
        process.exit(1);
    }
};

createHouseholdUser();
