import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const KYCVerification = () => {
    const { userProfile, submitKyc } = useAuth();
    const navigate = useNavigate();

    const [docType, setDocType] = useState('Aadhaar');
    const [docNumber, setDocNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    // Redirect to dashboard if they are already verified
    if (userProfile?.kycStatus === 'Verified') {
        navigate('/dashboard');
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API delay for Liveliness / AI Bot Review
        setStep(2);

        setTimeout(async () => {
            const success = await submitKyc(docType, docNumber);
            if (success) {
                setStep(3); // NFT Minted Success
                setTimeout(() => navigate('/dashboard'), 2000);
            } else {
                setLoading(false);
                setStep(1);
            }
        }, 3000);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
            <div className="bg-fintech-card border border-fintech-border p-8 rounded-xl max-w-md w-full shadow-2xl">

                {step === 1 && (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-2 text-center">Identity Verification</h2>
                        <p className="text-slate-400 text-sm mb-6 text-center">
                            To ensure platform security and issue your Soulbound Reputation NFT, please provide a valid ID.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Document Type</label>
                                <select
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="w-full bg-fintech-dark border border-fintech-border text-white rounded-lg p-3 outline-none focus:border-fintech-accent"
                                >
                                    <option value="Aadhaar">Aadhaar Card</option>
                                    <option value="PAN">PAN Card</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Document Number</label>
                                <input
                                    type="text"
                                    value={docNumber}
                                    onChange={(e) => setDocNumber(e.target.value)}
                                    placeholder="Enter ID string"
                                    required
                                    className="w-full bg-fintech-dark border border-fintech-border text-white rounded-lg p-3 outline-none focus:border-fintech-accent"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-4 bg-fintech-accent hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors"
                            >
                                Initiate AI Liveliness Check
                            </button>
                        </form>
                    </>
                )}

                {step === 2 && (
                    <div className="flex flex-col items-center py-10">
                        <div className="w-16 h-16 border-4 border-t-fintech-accent border-r-fintech-accent border-b-fintech-dark border-l-fintech-dark rounded-full animate-spin mb-6"></div>
                        <h3 className="text-xl font-bold text-white mb-2">Simulating Verification...</h3>
                        <p className="text-slate-400 text-sm text-center">
                            Running AI liveliness checks and minting identity NFT via Smart Contract.
                        </p>
                    </div>
                )}

                {step === 3 && (
                    <div className="flex flex-col items-center py-10">
                        <div className="w-16 h-16 bg-fintech-success/20 text-fintech-success rounded-full flex items-center justify-center mb-6">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Verified Successfully!</h3>
                        <p className="text-slate-400 text-sm text-center">
                            Soulbound NFT issued. Redirecting to your dashboard...
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default KYCVerification;
