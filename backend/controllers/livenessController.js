const { RekognitionClient, CreateFaceLivenessSessionCommand, GetFaceLivenessSessionResultsCommand } = require('@aws-sdk/client-rekognition');
const User = require('../models/User');

const client = new RekognitionClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

exports.createSession = async (req, res) => {
    try {
        const command = new CreateFaceLivenessSessionCommand({});
        const response = await client.send(command);

        res.json({ sessionId: response.SessionId });
    } catch (error) {
        console.error("Error creating liveness session:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifySession = async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID is required' });
        }

        const command = new GetFaceLivenessSessionResultsCommand({
            SessionId: sessionId
        });
        const response = await client.send(command);

        const confidence = response.Confidence || 0;
        const status = response.Status;

        // AWS Rekognition Liveness considers success when status is SUCCEEDED and confidence is high.
        const isLive = confidence >= 70 && status === 'SUCCEEDED';

        let riskLevel = 'Fake';
        if (confidence >= 70) riskLevel = 'Live';
        else if (confidence >= 50) riskLevel = 'Suspicious';

        const token = Math.random().toString(36).substring(2, 15);

        if (isLive && req.user) {
            await User.findByIdAndUpdate(req.user.id, { kycStatus: 'FaceVerified' });
        }

        res.json({
            success: isLive,
            riskLevel,
            confidenceScore: confidence,
            token: isLive ? token : null
        });
    } catch (error) {
        console.error("Error getting liveness results:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
