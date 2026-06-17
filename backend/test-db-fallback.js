require('dotenv').config();
const { connectDB, connectRedis, getMongoServerInstance } = require('./config/db');
const mongoose = require('mongoose');

async function test() {
    console.log("Starting DB connection test with local fallback...");
    await connectDB();
    console.log("ReadyState:", mongoose.connection.readyState);
    if (mongoose.connection.readyState === 1) {
        console.log("Successfully connected!");
        const inst = getMongoServerInstance();
        if (inst) {
            console.log("Connected to in-memory fallback server!");
        } else {
            console.log("Connected to standard MONGO_URI!");
        }
    } else {
        console.log("Failed to connect.");
    }
    process.exit(0);
}

test();
