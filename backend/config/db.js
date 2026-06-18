const mongoose = require('mongoose');
const { createClient } = require('redis');

let mongoServerInstance = null;

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB via MONGO_URI...');
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 4000,
            family: 4
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);

        // If standard MONGO_URI fallback is provided, try that first
        if (process.env.MONGO_URI_FALLBACK && error.message && error.message.includes('querySrv')) {
            try {
                console.log('Attempting MongoDB fallback using MONGO_URI_FALLBACK...');
                const fallbackConn = await mongoose.connect(process.env.MONGO_URI_FALLBACK, {
                    serverSelectionTimeoutMS: 5000,
                    family: 4
                });
                console.log(`MongoDB Connected (fallback): ${fallbackConn.connection.host}`);
                return;
            } catch (fbErr) {
                console.error('Fallback MongoDB connection failed:', fbErr.message);
            }
        }

        // Try falling back to mongodb-memory-server if all else fails
        console.log('Attempting to start local in-memory MongoDB server as fallback...');
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            mongoServerInstance = await MongoMemoryServer.create();
            const mongoUri = mongoServerInstance.getUri();
            console.log(`Local in-memory MongoDB server started at: ${mongoUri}`);

            const conn = await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000,
                family: 4
            });
            console.log(`MongoDB Connected (In-Memory Fallback): ${conn.connection.host}`);
            return;
        } catch (memErr) {
            console.error('Failed to start/connect to local in-memory MongoDB fallback:', memErr.message);
        }

        // If everything fails, retry original connectDB after a delay
        setTimeout(connectDB, 5000);
    }
};

let redisClient;

const connectRedis = async () => {
    // Proactively check if the URL points to the defunct redislabs.com server
    const isDefunctCloudRedis = process.env.REDIS_URL && process.env.REDIS_URL.includes('redislabs.com');

    if (isDefunctCloudRedis) {
        console.log('Detected defunct Cloud Redis URL. Falling back to Mock Redis client immediately.');
        redisClient = {
            on: () => {},
            connect: () => Promise.resolve(),
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(),
            del: () => Promise.resolve(),
            quit: () => Promise.resolve()
        };
        return;
    }

    try {
        redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 2) {
                        return new Error('Redis connection failed');
                    }
                    return 1000;
                }
            }
        });

        redisClient.on('error', (err) => {
            console.log('Redis Client Error', err.message || err);
        });

        await redisClient.connect();
        console.log('Redis connected successfully');
    } catch (err) {
        console.error(`Error connecting to Redis: ${err.message}`);
        // Provide mock client so we don't crash
        redisClient = {
            on: () => {},
            connect: () => Promise.resolve(),
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(),
            del: () => Promise.resolve(),
            quit: () => Promise.resolve()
        };
        console.log('Mock Redis client initialized successfully as fallback');
    }
}

module.exports = { 
    connectDB, 
    connectRedis, 
    getRedisClient: () => redisClient,
    getMongoServerInstance: () => mongoServerInstance
};

