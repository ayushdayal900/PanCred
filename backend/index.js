const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const { connectDB, connectRedis } = require('./config/db');

connectDB();
connectRedis();
const app = express();
const userRoutes = require('./routes/userRoutes');
const loanRoutes = require('./routes/loanRoutes');
const authRoutes = require('./routes/authRoutes');
const port = process.env.PORT || 5000;
const { connectProvider, listenToContractEvents } = require('./services/blockchainService');

// Initialize Blockchain Service
connectProvider();
listenToContractEvents();

// Security and utility Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Core API Routes
app.use('/api/users', userRoutes);
app.use('/api/loans', loanRoutes);
app.use('/auth', authRoutes);

// Basic Route for health check
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Microfinance API', status: 'OK' });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

module.exports = app;
