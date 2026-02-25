const mongoose = require('mongoose');
const { createClient } = require('redis');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

let redisClient;

const connectRedis = async () => {
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL
        });

        redisClient.on('error', (err) => console.log('Redis Client Error', err));

        await redisClient.connect();
        console.log('Redis connected successfully');
    } catch (err) {
        console.error(`Error connecting to Redis: ${err.message}`);
    }
}

module.exports = { connectDB, connectRedis, getRedisClient: () => redisClient };
