const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    walletAddress: {
        type: String,
        sparse: true,
        index: true,
    },
    role: {
        type: String,
        enum: ['Borrower', 'Lender', 'Unassigned'],
        default: 'Unassigned',
    },
    kycStatus: {
        type: String,
        enum: ['Pending', 'FaceVerified', 'Verified', 'Rejected'],
        default: 'Pending',
    },
    kycDetails: {
        documentType: { type: String, enum: ['Aadhaar', 'PAN'] },
        documentNumber: { type: String },
        verifiedAt: { type: Date }
    },
    nftIssued: {
        type: Boolean,
        default: false,
    },
    nftTxHash: {
        type: String,
    },
    trustScore: {
        type: Number,
        default: 0, // 0-1000 scale, updated by simulated ML model/repayments
    }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
