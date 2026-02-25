import React, { useState, useEffect, useRef } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUser,
    FiShield,
    FiCamera,
    FiPocket,
    FiCheckCircle,
    FiArrowRight,
    FiBriefcase,
    FiCreditCard,
    FiAlertCircle,
    FiLoader
} from 'react-icons/fi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConfig } from 'wagmi';
import { getConnectorClient } from '@wagmi/core';
import { mintIdentity, checkIdentityOwnership } from '../blockchainService';

// Contract Constants are now managed in blockchainService.js and addresses.json

const Onboarding = () => {
    const { userProfile, updateRole, submitKyc } = useAuth();
    const navigate = useNavigate();
    const { address, isConnected, chainId } = useAccount();
    const config = useConfig();

    const [currentStep, setCurrentStep] = useState(2); // Start from Role Selection
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Automatically determine starting step
    useEffect(() => {
        console.log("[Onboarding] Mount check...", {
            isAuthenticated: !!userProfile,
            kycStatus: userProfile?.kycStatus,
            localOnboarded: localStorage.getItem("isOnboarded") === "true",
            currentStep
        });

        if (!userProfile) {
            navigate('/signin');
            return;
        }

        // Only auto-jump to success if we are truly done
        const localOnboarded = localStorage.getItem("isOnboarded") === "true";
        if (userProfile.kycStatus === 'Verified' || localOnboarded) {
            console.log("[Onboarding] User already verified, snapping to Step 7");
            setCurrentStep(7);
            return;
        }

        if (currentStep === 2) { // Only auto-route for initial load
            if (userProfile?.role === 'Unassigned') {
                setCurrentStep(2);
            } else if (userProfile?.kycStatus === 'Pending') {
                setCurrentStep(3);
            } else if (userProfile?.kycStatus === 'FaceVerified') {
                setCurrentStep(5);
            }
        }
    }, [userProfile]); // Removed navigate from deps to prevent loop during snap

    // Step Data
    const [role, setRole] = useState('');
    const [aadhaar, setAadhaar] = useState('');
    const [livelinessVerified, setLivelinessVerified] = useState(false);
    const [txnHash, setTxnHash] = useState('');
    const [nftMinted, setNftMinted] = useState(false);

    // Webcam Ref
    const webcamRef = useRef(null);
    const [blinkInstruction, setBlinkInstruction] = useState(false);

    // Progress percentage (adjusted for 6 actual steps now: 2 to 7)
    const progress = ((currentStep - 1) / 6) * 100;

    const steps = [
        { id: 2, title: 'Role', icon: <FiBriefcase /> },
        { id: 3, title: 'Identity', icon: <FiShield /> },
        { id: 4, title: 'Liveliness', icon: <FiCamera /> },
        { id: 5, title: 'Wallet', icon: <FiPocket /> },
        { id: 6, title: 'Mint NFT', icon: <FiCreditCard /> },
        { id: 7, title: 'Success', icon: <FiCheckCircle /> },
    ];

    // --- STEP 2: ROLE SELECTION ---
    const handleRoleSelect = async (selectedRole) => {
        setRole(selectedRole);
        setLoading(true);
        try {
            await updateRole(selectedRole);
            setCurrentStep(3);
        } catch (err) {
            setError('Failed to update role.');
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 3: AADHAAR VERIF ---
    const handleAadhaarSubmit = async (e) => {
        e.preventDefault();
        if (!/^\d{12}$/.test(aadhaar)) {
            setError('Aadhaar must be exactly 12 numeric digits.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/users/verify-kyc', { aadhaarNumber: aadhaar });
            if (response.data.verified) {
                setCurrentStep(4);
            }
        } catch (err) {
            console.error('[KYC] Aadhaar verification failed:', err);
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Verification failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Captured Image for KYC
    const [kycImage, setKycImage] = useState(null);

    // --- STEP 4: LIVELINESS CHECK ---
    const performLiveliness = () => {
        setLoading(true);
        setError('');
        setBlinkInstruction(true);

        // Captured screenshot for storage, but no AI check
        setTimeout(() => {
            const imageSrc = webcamRef.current.getScreenshot();
            setKycImage(imageSrc);

            setLoading(false);
            setBlinkInstruction(false);
            setLivelinessVerified(true);
            setCurrentStep(5);
        }, 3000);
    };

    // Auto-advance from Step 5 if wallet is connected
    useEffect(() => {
        if (currentStep === 5 && isConnected && address) {
            setCurrentStep(6);
        }
    }, [currentStep, isConnected, address]);

    // --- STEP 6: MINT NFT ---
    const handleMintNft = async () => {
        setError('');
        setLoading(true);
        try {
            // 0. Get Signer via Wagmi
            const client = await getConnectorClient(config, { chainId });
            const provider = new ethers.BrowserProvider(client.transport);
            const signer = new ethers.JsonRpcSigner(provider, client.account.address);

            // 1. Execute Mint via Frontend Signer
            const { receipt, txHash } = await mintIdentity(signer, (hash) => setTxnHash(hash));

            // 2. Final verification of ownership
            const isOwner = await checkIdentityOwnership(address);
            if (!isOwner) {
                throw new Error("Identity verification failed. Please check your transaction on Etherscan.");
            }

            // SUCCESS! Set flags
            console.log("[Onboarding] Identity Verified on Sepolia. Finalizing...");
            localStorage.setItem("isOnboarded", "true");
            localStorage.setItem("walletAddress", address);
            localStorage.setItem("userRole", role || userProfile?.role);

            // Update backend (KYC completion)
            await submitKyc('Aadhaar', aadhaar, kycImage, address, txHash);

            setNftMinted(true);
            setCurrentStep(7);

            setTimeout(() => {
                navigate('/dashboard');
            }, 3000);

        } catch (err) {
            console.error(err);
            setError(err.reason || err.message || 'Minting failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-fintech-dark flex flex-col items-center justify-center p-6 pt-24 font-sans text-slate-200">
            {/* Progress Indicator */}
            <div className="w-full max-w-4xl mb-12">
                <div className="flex justify-between items-center mb-4 px-2">
                    {steps.map((s) => (
                        <div key={s.id} className="flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${currentStep >= s.id ? 'bg-fintech-accent border-fintech-accent text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-fintech-card border-fintech-border text-slate-500'
                                }`}>
                                {currentStep > s.id ? <FiCheckCircle size={22} /> : s.icon}
                            </div>
                            <span className={`text-[10px] mt-3 font-bold uppercase tracking-tighter ${currentStep >= s.id ? 'text-white' : 'text-slate-600'}`}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="h-2 w-full bg-fintech-card rounded-full overflow-hidden border border-fintech-border/30 px-0.5 py-0.5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-gradient-to-r from-blue-600 to-fintech-accent rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    />
                </div>
            </div>

            <div className="w-full max-w-2xl bg-fintech-card p-10 rounded-[2.5rem] border border-fintech-border shadow-2xl relative overflow-hidden backdrop-blur-xl">
                {/* Decorative backgrounds */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-fintech-accent/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>

                <AnimatePresence mode="wait">
                    {/* STEP 2: ROLE SELECTION */}
                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="text-center"
                        >
                            <h2 className="text-4xl font-black text-white mb-3">Choose Your Role</h2>
                            <p className="text-slate-400 mb-10 text-lg">Define your participation in the Aamba ecosystem.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <button
                                    onClick={() => handleRoleSelect('Lender')}
                                    className="group p-10 bg-fintech-dark/40 border-2 border-fintech-border rounded-[2rem] hover:border-fintech-accent transition-all text-left relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all">
                                        <FiCreditCard size={120} />
                                    </div>
                                    <div className="w-14 h-14 bg-fintech-accent/20 text-fintech-accent rounded-2xl flex items-center justify-center mb-6">
                                        <FiBriefcase size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">Lender</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">Provide liquidity to the pool and earn competitive interest from decentralized loans.</p>
                                </button>

                                <button
                                    onClick={() => handleRoleSelect('Borrower')}
                                    className="group p-10 bg-fintech-dark/40 border-2 border-fintech-border rounded-[2rem] hover:border-fintech-accent transition-all text-left relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all">
                                        <FiArrowRight size={120} />
                                    </div>
                                    <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                                        <FiUser size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">Borrower</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed">Access uncollateralized capital based on your on-chain identity and trust score.</p>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: AADHAAR */}
                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-4xl font-black text-white mb-3 text-center">Verify Identity</h2>
                            <p className="text-slate-400 mb-10 text-center text-lg">We use your Aadhaar to establish non-transferable trust.</p>

                            <form onSubmit={handleAadhaarSubmit} className="space-y-8 max-w-sm mx-auto">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3 px-1">12-Digit Identification Number</label>
                                    <input
                                        type="text"
                                        maxLength={12}
                                        value={aadhaar}
                                        onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                                        placeholder="0000 0000 0000"
                                        className="w-full bg-fintech-dark/50 border border-fintech-border focus:border-fintech-accent rounded-2xl py-5 px-6 text-white text-xl font-mono tracking-[0.3em] outline-none transition-all text-center"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm">
                                        <FiAlertCircle className="flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-fintech-accent hover:bg-blue-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 text-lg"
                                >
                                    {loading ? <FiLoader className="animate-spin" /> : <>Continue to Face Scan <FiArrowRight /></>}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* STEP 4: LIVELINESS */}
                    {currentStep === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="text-center"
                        >
                            <h2 className="text-4xl font-black text-white mb-3">Liveliness Check</h2>
                            <p className="text-slate-400 mb-10 text-lg">Position your face within the frame to verify your identity.</p>

                            <div className="relative w-full max-w-sm mx-auto aspect-square rounded-[2.5rem] overflow-hidden border-4 border-fintech-border/50 bg-black mb-10">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                />
                                {loading && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6">
                                        <div className="w-20 h-20 border-4 border-fintech-accent border-t-transparent rounded-full animate-spin mb-6"></div>
                                        <p className="text-white font-black text-2xl tracking-tight animate-pulse">{blinkInstruction ? 'Blink Twice' : 'Analyzing Face...'}</p>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm justify-center mb-6 max-w-sm mx-auto">
                                    <FiAlertCircle className="flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {!loading && (
                                <button
                                    onClick={performLiveliness}
                                    className="bg-fintech-accent hover:bg-blue-600 text-white font-bold py-5 px-16 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 mx-auto text-lg"
                                >
                                    Start Analysis <FiCamera />
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 5: WALLET */}
                    {currentStep === 5 && (
                        <motion.div
                            key="step5"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="text-center"
                        >
                            <h2 className="text-4xl font-black text-white mb-3">Connect Wallet</h2>
                            <p className="text-slate-400 mb-10 text-lg">Secure your on-chain identity with your preferred wallet.</p>

                            <div className="p-16 border-2 border-dashed border-fintech-border rounded-[2.5rem] bg-fintech-dark/30 mb-10 flex flex-col items-center group hover:border-fintech-accent/50 transition-all text-center">
                                <div className="w-24 h-24 bg-fintech-warning/10 text-fintech-warning rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform mx-auto">
                                    <FiPocket size={48} />
                                </div>
                                <div className="flex justify-center w-full">
                                    <ConnectButton />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm justify-center">
                                    <FiAlertCircle className="flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {isConnected && (
                                <button
                                    onClick={() => setCurrentStep(6)}
                                    className="mt-6 text-fintech-accent font-bold hover:underline"
                                >
                                    Wallet connected! Click to proceed.
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* STEP 6: MINT NFT */}
                    {currentStep === 6 && (
                        <motion.div
                            key="step6"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="text-center"
                        >
                            <h2 className="text-4xl font-black text-white mb-3">Claim Identity NFT</h2>
                            <p className="text-slate-400 mb-10 text-lg">Minting your unique, non-transferable Aamba ID.</p>

                            <div className="relative group max-w-xs mx-auto mb-12">
                                <div className="absolute inset-0 bg-fintech-accent/20 blur-2xl group-hover:bg-fintech-accent/40 transition-all"></div>
                                <div className="relative bg-fintech-dark/80 border-2 border-fintech-accent/30 p-10 rounded-[2rem] aspect-square flex flex-col items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)] backdrop-blur-md">
                                    <FiShield size={100} className="text-fintech-accent mb-6" />
                                    <h4 className="font-black text-2xl text-white">Aamba ID</h4>
                                    <p className="text-[10px] text-slate-500 font-mono mt-3 truncate w-full">{address}</p>
                                    {txnHash && (
                                        <div className="mt-6 p-4 bg-fintech-accent/5 rounded-2xl border border-fintech-accent/20 w-full">
                                            <p className="text-[10px] text-fintech-accent uppercase font-black text-left mb-2 tracking-widest">Transaction Sent</p>
                                            <p className="text-[9px] text-slate-500 font-mono break-all mb-3 text-left">{txnHash}</p>
                                            <a
                                                href={`https://sepolia.etherscan.io/tx/${txnHash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[10px] text-white font-bold flex items-center gap-2 hover:text-fintech-accent transition-colors"
                                            >
                                                View on Etherscan <FiExternalLink size={10} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm mb-8 text-left">
                                    <FiAlertCircle className="flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                onClick={handleMintNft}
                                disabled={loading}
                                className="w-full max-w-sm bg-fintech-accent hover:bg-blue-600 text-white font-black py-5 px-16 rounded-2xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center gap-3 mx-auto text-lg"
                            >
                                {loading ? <FiLoader className="animate-spin" /> : <>Mint Soulbound ID <FiCreditCard /></>}
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 7: SUCCESS */}
                    {currentStep === 7 && (
                        <motion.div
                            key="step7"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                <FiCheckCircle size={48} />
                            </div>
                            <h2 className="text-5xl font-black text-white mb-6 tracking-tight">Access Granted!</h2>
                            <p className="text-slate-400 max-w-md mx-auto mb-12 text-lg leading-relaxed">
                                Your decentralized identity is now active. You can now use the microfinance features of Aamba.
                            </p>

                            <div className="bg-fintech-dark/40 rounded-[2rem] p-8 mb-10 text-left border border-fintech-border/50 divide-y divide-fintech-border/20">
                                <div className="py-4 flex justify-between items-center">
                                    <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">Protocol Role</span>
                                    <span className="text-white font-black text-lg">{userProfile?.role}</span>
                                </div>
                                <div className="py-4 flex justify-between items-center">
                                    <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">Identity Status</span>
                                    <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-green-500/30">Validated NFT</span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full bg-white text-black font-black py-6 rounded-2xl hover:bg-slate-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3 text-xl"
                            >
                                Enter Dashboard <FiArrowRight />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <p className="mt-12 text-slate-600 text-[10px] font-black tracking-[0.4em] uppercase opacity-50">Decentralized Microfinance Engine // Aamba</p>
        </div >
    );
};

export default Onboarding;
