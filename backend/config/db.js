const mongoose = require('mongoose');
const { createClient } = require('redis');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        // If the initial connection fails, retry after a few seconds
        setTimeout(connectDB, 5000);
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
