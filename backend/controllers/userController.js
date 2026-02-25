const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/users/register
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please add all fields' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        if (user) {
            res.status(201).json({
                success: true,
                data: {
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    kycStatus: user.kycStatus,
                    token: generateToken(user._id),
                }
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Authenticate/Register user via Wallet
// @route   POST /api/users/wallet-login
exports.walletLogin = async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ message: 'Wallet address required' });
        }

        // Find user by wallet address
        let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

        if (!user) {
            // Create a placeholder user for onboarding if not found
            // In a real app, we'd signed a message
            user = await User.create({
                name: `User ${walletAddress.slice(0, 6)}`,
                email: `${walletAddress.toLowerCase()}@aamba.io`,
                password: await bcrypt.hash(Math.random().toString(36), 10),
                walletAddress: walletAddress.toLowerCase(),
                role: 'Unassigned',
                kycStatus: 'Pending'
            });
        }

        res.json({
            success: true,
            data: {
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                kycStatus: user.kycStatus,
                walletAddress: user.walletAddress,
                token: generateToken(user._id),
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                success: true,
                data: {
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    kycStatus: user.kycStatus,
                    walletAddress: user.walletAddress,
                    token: generateToken(user._id),
                }
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user role (Lender/Borrower)
// @route   PUT /api/users/role
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['Borrower', 'Lender'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role selection' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { role },
            { new: true, runValidators: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({
            success: true,
            data: {
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                kycStatus: user.kycStatus,
                walletAddress: user.walletAddress,
                token: generateToken(user._id),
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Verify Aadhaar (Mocked)
// @route   POST /api/users/verify-kyc
exports.verifyKyc = async (req, res) => {
    try {
        const { aadhaarNumber } = req.body;
        console.log(`[KYC] Verification request for Aadhaar: ${aadhaarNumber} from User ${req.user?._id}`);

        // Basic validation: 12-digit numeric
        if (!/^\d{12}$/.test(aadhaarNumber)) {
            return res.status(400).json({ success: false, message: 'Invalid Aadhaar number. Must be 12 digits.' });
        }

        // Mock success
        res.status(200).json({
            success: true,
            verified: true,
            message: 'Aadhaar verified successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Perform AI liveliness check using Hugging Face
// @route   POST /api/users/liveliness
exports.checkLiveliness = async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ success: false, message: 'Image is required for liveliness check' });
        }

        console.log("[AI] Analyzing image with Hugging Face...");
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const hfModelId = process.env.HF_MODEL_ID || 'google/vit-base-patch16-224';

        const apiResponse = await fetch(`https://api-inference.huggingface.co/models/${hfModelId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HF_API_KEY}`,
                'Content-Type': 'application/octet-stream',
                'x-wait-for-model': 'true'
            },
            body: imageBuffer
        });

        if (apiResponse.ok) {
            const modelResult = await apiResponse.json();
            console.log("[AI] HF Analysis Complete:", modelResult);

            if (modelResult && modelResult.length > 0 && modelResult[0].score > 0.05) {
                // Persistence: Update user status in DB so they don't lose progress on refresh
                await User.findByIdAndUpdate(req.user.id, { kycStatus: 'FaceVerified' });

                return res.status(200).json({
                    success: true,
                    message: 'AI Liveliness Check Passed',
                    analysis: modelResult
                });
            } else {
                return res.status(422).json({
                    success: false,
                    message: 'AI could not confidently identify a face. Please adjust your lighting and try again.'
                });
            }
        } else {
            const errorLog = await apiResponse.text();
            console.error("[AI] HF Error:", errorLog);

            const message = errorLog.includes('loading')
                ? 'AI Engine is still warming up. Please wait 15 seconds and try again.'
                : 'AI analysis failed. Please ensure your face is well-lit and directly facing the camera.';

            return res.status(422).json({
                success: false,
                message: message
            });
        }
    } catch (error) {
        console.error("[AI] Error:", error);
        res.status(500).json({ success: false, message: 'AI processing error. Please try again.' });
    }
};

// @desc    Submit KYC details and simulate Liveliness check/NFT minting
// @route   POST /api/users/kyc
exports.submitKYC = async (req, res) => {
    try {
        const { walletAddress, documentType, documentNumber, image } = req.body;

        if (!image) {
            return res.status(400).json({ success: false, message: 'Liveliness scan image is required' });
        }

        // Logic depends on whether we are just verifying face or minting NFT
        const userFind = await User.findById(req.user.id);

        if (!walletAddress) {
            // STEP 1: Face Verification Only
            const updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { kycStatus: 'FaceVerified' },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: 'Liveliness Check Passed. Please connect your wallet to mint your Identity NFT.',
                data: {
                    _id: updatedUser.id,
                    kycStatus: updatedUser.kycStatus,
                    token: generateToken(updatedUser._id),
                }
            });
        }

        // STEP 2: Use the Tx Hash provided by front-end (MetaMask signing)
        let nftTxHash = req.body.txHash;
        if (!nftTxHash) {
            return res.status(400).json({ success: false, message: 'Minting transaction hash is required for verification.' });
        }

        if (nftTxHash === "ALREADY_OWNED") {
            nftTxHash = "N/A (SBT Already in Wallet)";
        }


        const kycDetails = {
            documentType,
            documentNumber,
            verifiedAt: new Date()
        };

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                kycStatus: 'Verified',
                kycDetails,
                nftIssued: true,
                trustScore: 300,
                walletAddress: walletAddress.toLowerCase(),
                nftTxHash
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'KYC Verified and Soulbound NFT Issued to your wallet!',
            data: {
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                kycStatus: user.kycStatus,
                walletAddress: user.walletAddress,
                nftIssued: user.nftIssued,
                token: generateToken(user._id),
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};
