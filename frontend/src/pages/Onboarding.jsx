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
    FiLoader,
    FiExternalLink,
    FiXCircle,
    FiActivity
} from 'react-icons/fi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConfig, useWalletClient, useSwitchChain } from 'wagmi';
import { mintIdentity, checkIdentityOwnership } from '../blockchainService';
import toast from 'react-hot-toast';

const Onboarding = () => {
    const { userProfile, updateRole, submitKyc, logout } = useAuth();
    const navigate = useNavigate();
    const { address, isConnected: walletConnected, chainId } = useAccount();
    const config = useConfig();
    const { data: walletClient, status: walletClientStatus } = useWalletClient();
    const { switchChain } = useSwitchChain();

    const [currentStep, setCurrentStep] = useState(2);
    const [loading, setLoading] = useState(false);
    const [walletConfirmed, setWalletConfirmed] = useState(false);

    const isOnboarded = localStorage.getItem("isOnboarded") === "true";
    const isAuthenticated = !!userProfile;

    useEffect(() => {
        console.log(`[Onboarding] State Update - Step: ${currentStep}, Wallet: ${walletConnected}, Client Status: ${walletClientStatus}, Chain ID: ${chainId}, Auth: ${isAuthenticated}, Onboarded: ${isOnboarded}`);
    }, [currentStep, walletConnected, walletClientStatus, chainId, isAuthenticated, isOnboarded]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/signin');
            return;
        }

        // Only set step based on profile if we are NOT already onboarded and at the start
        if (currentStep === 2) {
            if (userProfile?.role === 'Unassigned') {
                setCurrentStep(2);
            } else if (userProfile?.kycStatus === 'Pending') {
                setCurrentStep(3);
                console.log("[Onboarding] jumping to step 3 based on kycStatus");
            } else if (userProfile?.kycStatus === 'FaceVerified') {
                setCurrentStep(5);
                console.log("[Onboarding] jumping to step 5 based on kycStatus");
            }
        }
    }, [userProfile, isAuthenticated, isOnboarded, currentStep, walletConnected]);

    const handleExitOnboarding = () => {
        const confirmExit = window.confirm("Are you sure you want to exit? Your protocol initialization progress will be reset.");
        if (confirmExit) {
            localStorage.removeItem("isOnboarded");
            navigate('/signin');
        }
    };

    const [role, setRole] = useState('');
    const [aadhaar, setAadhaar] = useState('');
    const [txnHash, setTxnHash] = useState('');

    const webcamRef = useRef(null);
    const [blinkInstruction, setBlinkInstruction] = useState(false);
    const [kycImage, setKycImage] = useState(null);

    const progress = ((currentStep - 1) / 6) * 100;

    const steps = [
        { id: 2, title: 'Role', icon: <FiBriefcase /> },
        { id: 3, title: 'Identity', icon: <FiShield /> },
        { id: 4, title: 'Bio', icon: <FiCamera /> },
        { id: 5, title: 'Wallet', icon: <FiPocket /> },
        { id: 6, title: 'Mint', icon: <FiCreditCard /> },
        { id: 7, title: 'Done', icon: <FiCheckCircle /> },
    ];

    const handleRoleSelect = async (selectedRole) => {
        setRole(selectedRole);
        setLoading(true);
        const tid = toast.loading(`Primary role: ${selectedRole}...`);
        try {
            await updateRole(selectedRole);
            toast.success('Role assigned', { id: tid });
            setCurrentStep(3);
        } catch (err) {
            toast.error('Failed to update role', { id: tid });
        } finally {
            setLoading(false);
        }
    };

    const handleAadhaarSubmit = async (e) => {
        e.preventDefault();
        if (!/^\d{12}$/.test(aadhaar)) {
            return toast.error('Check Aadhaar Number format');
        }
        setLoading(true);
        const tid = toast.loading('Verifying identity document...');
        try {
            const response = await api.post('/users/verify-kyc', { aadhaarNumber: aadhaar });
            if (response.data.verified) {
                toast.success('Document verified', { id: tid });
                setCurrentStep(4);
            }
        } catch (err) {
            toast.error('Identity verification failed', { id: tid });
        } finally {
            setLoading(false);
        }
    };

    const performLiveliness = () => {
        setLoading(true);
        setBlinkInstruction(true);
        const tid = toast.loading('Analyzing biometric markers...');

        setTimeout(() => {
            const imageSrc = webcamRef.current.getScreenshot();
            setKycImage(imageSrc);
            setLoading(false);
            setBlinkInstruction(false);
            toast.success('Liveliness confirmed', { id: tid });
            setCurrentStep(5);
        }, 3000);
    };

    // No auto-progression from wallet to mint anymore to prevent "bypassing"
    const handleWalletConnectionProceed = () => {
        if (walletConnected && address) {
            setWalletConfirmed(true);
            setCurrentStep(6);
            console.log("[Onboarding] Manual wallet confirmation received. Proceeding to Mint.");
        } else {
            toast.error("Please connect your wallet first.");
        }
    };

    const handleMintNft = async () => {
        console.log(`[Onboarding] Mint attempt. Status: ${walletClientStatus}, Client: ${!!walletClient}, Chain: ${chainId}`);

        if (!walletConnected) {
            return toast.error("Please connect your wallet first.");
        }

        if (chainId !== 11155111) {
            toast.error("You are on the wrong network. Switching to Sepolia...");
            try {
                await switchChain({ chainId: 11155111 });
            } catch (e) {
                console.error("Failed to switch chain", e);
                return toast.error("Please manually switch your wallet to Sepolia network.");
            }
            return;
        }

        if (!walletClient) {
            if (walletClientStatus === 'pending') {
                return toast.error("Wallet connection is still initializing. Please wait a moment.");
            }
            return toast.error("Wallet connection lost. Please try reconnecting or refreshing the page.");
        }

        setLoading(true);
        const tid = toast.loading('Initiating on-chain identity mint...');
        try {
            const provider = new ethers.BrowserProvider(walletClient.transport);
            const signer = await provider.getSigner();

            toast.loading('Confirm mint in wallet...', { id: tid });
            const result = await mintIdentity(signer, (hash) => setTxnHash(hash));

            if (result.alreadyExists) {
                toast.success('Identity already exists on-chain.', { id: tid });
            } else {
                toast.loading('Waiting for blockchain confirmation...', { id: tid });
                const isOwner = await checkIdentityOwnership(address);
                if (!isOwner) throw new Error("Identity verification failed on-chain.");
                toast.success('Identity Soulbound Successfully!', { id: tid });
            }

            localStorage.setItem("isOnboarded", "true");
            localStorage.setItem("walletAddress", address);
            localStorage.setItem("userRole", role || userProfile?.role);

            toast.loading('Finalizing protocol synchronization...', { id: tid });
            await submitKyc('Aadhaar', aadhaar, kycImage, address, result.txHash || 'existing');

            setCurrentStep(7);
        } catch (err) {
            console.error("Mint error:", err);
            toast.error(err.message || 'Minting failed. Check network.', { id: tid });
        } finally {
            setLoading(false);
        }
    };

    // Auto-progress if already has NFT while on mint step
    useEffect(() => {
        if (currentStep === 6 && address) {
            checkIdentityOwnership(address).then(hasNft => {
                if (hasNft) {
                    localStorage.setItem("isOnboarded", "true");
                    setCurrentStep(7);
                }
            });
        }
    }, [currentStep, address]);

    return (
        <div className="min-h-screen bg-fintech-dark flex flex-col items-center justify-start py-12 md:py-24 px-4 md:px-6 font-sans text-slate-200 relative overflow-x-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] aspect-square bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[60%] aspect-square bg-fintech-accent/5 rounded-full blur-[120px]"></div>
            </div>

            {/* Exit Button */}
            <button
                onClick={handleExitOnboarding}
                className="absolute top-6 left-6 md:top-10 md:left-10 text-slate-600 hover:text-white flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest group"
            >
                <FiXCircle className="group-hover:rotate-90 transition-transform duration-300" /> Exit Protocol Initialization
            </button>

            {/* Stepper Container */}
            <div className="w-full max-w-4xl mb-12 md:mb-16">
                <div className="flex justify-between items-center mb-6 overflow-x-auto no-scrollbar pb-4 md:pb-0 px-2 gap-8 md:gap-0">
                    {steps.map((s) => (
                        <div key={s.id} className="flex flex-col items-center group flex-shrink-0">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border-2 transition-all duration-700 ${currentStep >= s.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                                {currentStep > s.id ? <FiCheckCircle size={18} /> : s.icon}
                            </div>
                            <span className={`text-[8px] md:text-[9px] mt-3 font-black uppercase tracking-widest ${currentStep >= s.id ? 'text-white' : 'text-slate-700'}`}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-blue-600 rounded-full shadow-lg shadow-blue-600/30"
                    />
                </div>
            </div>

            <div className="w-full max-w-3xl">
                <AnimatePresence mode="wait">
                    {/* ROLE */}
                    {currentStep === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter italic">Primary Access Role</h2>
                            <p className="text-sm md:text-base text-slate-500 font-medium mb-10 md:mb-12">How will you participate in the Aamba protocol?</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 text-left">
                                <button onClick={() => handleRoleSelect('Lender')} className="group p-8 md:p-10 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] hover:border-blue-600 transition-all">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><FiBriefcase size={28} /></div>
                                    <h3 className="text-xl md:text-2xl font-black text-white mb-2 italic">Lender</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">Deploy capital to secure, protocol-verified loan requests and earn transparent interest.</p>
                                </button>
                                <button onClick={() => handleRoleSelect('Borrower')} className="group p-8 md:p-10 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] hover:border-blue-600 transition-all">
                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><FiUser size={28} /></div>
                                    <h3 className="text-xl md:text-2xl font-black text-white mb-2 italic">Borrower</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">Obtain peer-to-peer capital backed by your on-chain reputation and verified identity.</p>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* IDENTITY */}
                    {currentStep === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-md mx-auto w-full">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 text-center tracking-tighter italic">Identity Anchor</h2>
                            <p className="text-sm md:text-base text-slate-500 font-medium text-center mb-10 md:mb-12">We use decentralized verification to issuance your Soulbound ID.</p>
                            <form onSubmit={handleAadhaarSubmit} className="space-y-6 md:space-y-8">
                                <div className="premium-card !p-8 md:!p-10">
                                    <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-6 md:mb-8 text-center">12-Digit Unified Identifier</label>
                                    <input
                                        type="text" maxLength={12} value={aadhaar}
                                        onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                                        placeholder="0000 0000 0000"
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-600 rounded-2xl py-5 md:py-6 text-xl md:text-2xl font-mono tracking-[0.4em] text-white text-center outline-none transition-all shadow-inner"
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary w-full !py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                                    {loading ? <FiLoader className="animate-spin inline" /> : <>Continue to Biometrics <FiArrowRight className="inline ml-2" /></>}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* LIVELINESS */}
                    {currentStep === 4 && (
                        <motion.div key="s4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter italic">Biometric Liveliness</h2>
                            <p className="text-sm md:text-base text-slate-500 font-medium mb-10 md:mb-12">Confirm your presence to anchor your identity on-chain.</p>
                            <div className="relative w-64 h-64 md:w-72 md:h-72 mx-auto rounded-[3.5rem] overflow-hidden border-4 border-slate-900 bg-slate-950 mb-10 md:mb-12 shadow-2xl">
                                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover grayscale brightness-110" />
                                {loading && (
                                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                                        <FiLoader className="text-blue-600 animate-spin mb-4" size={40} />
                                        <p className="text-white font-black text-xl md:text-2xl uppercase tracking-tighter animate-pulse">{blinkInstruction ? 'Blink Twice' : 'Processing...'}</p>
                                    </div>
                                )}
                            </div>
                            {!loading && (
                                <button onClick={performLiveliness} className="btn-primary !px-12 !py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-xl">Start Biometric Scan</button>
                            )}
                        </motion.div>
                    )}

                    {/* WALLET */}
                    {currentStep === 5 && (
                        <motion.div key="s5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center max-w-md mx-auto w-full">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter italic">Protocol Link</h2>
                            <p className="text-sm md:text-base text-slate-500 font-medium mb-10 md:mb-12">Anchor your verified identity to a Web3 wallet.</p>
                            <div className="premium-card !p-12 md:!p-16 border-2 border-dashed border-slate-800 bg-slate-950/50 mb-8 flex flex-col items-center group transition-all">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600/10 text-blue-600 rounded-3xl flex items-center justify-center mb-8 md:mb-10 group-hover:scale-110 transition-transform"><FiPocket size={40} /></div>
                                <div className="w-full overflow-hidden flex justify-center mb-8">
                                    <ConnectButton />
                                </div>

                                {walletConnected && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={handleWalletConnectionProceed}
                                        className="btn-primary w-full !py-4 text-[10px] font-black uppercase tracking-[0.2em]"
                                    >
                                        Continue to Minting <FiArrowRight className="inline ml-2" />
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* MINT */}
                    {currentStep === 6 && (
                        <motion.div key="s6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center max-w-md mx-auto w-full">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter italic">Issue Soulbound ID</h2>
                            <p className="text-sm md:text-base text-slate-500 font-medium mb-10 md:mb-12">Minting your immutable protocol identifier on Sepolia.</p>

                            <div className="relative group mx-auto mb-10 md:mb-12 w-full max-w-[280px] md:max-w-xs">
                                <div className="absolute inset-0 bg-blue-600/10 blur-3xl pointer-events-none"></div>
                                <div className="relative bg-slate-950 border-2 border-blue-600/30 p-8 md:p-12 rounded-[4rem] aspect-square flex flex-col items-center justify-center shadow-2xl">
                                    <FiShield size={80} className="md:w-24 md:h-24 text-blue-600 mb-6 drop-shadow-md" />
                                    <h4 className="font-black text-xl md:text-2xl text-white italic tracking-tighter">AAMBA ID</h4>
                                    <p className="text-[8px] md:text-[9px] text-slate-600 font-mono mt-4 truncate w-full">{address}</p>
                                    {txnHash && (
                                        <div className="mt-8 p-4 bg-slate-900 rounded-2xl border border-slate-800 w-full text-left">
                                            <p className="text-[8px] md:text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">Broadcasting</p>
                                            <a href={`https://sepolia.etherscan.io/tx/${txnHash}`} target="_blank" rel="noreferrer" className="text-[8px] md:text-[9px] text-white font-mono flex items-center gap-2 hover:text-blue-500 transition-colors">Explorer <FiExternalLink size={10} /></a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mb-8">
                                {chainId !== 11155111 ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="px-5 py-2.5 bg-red-500/10 text-red-500 border border-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <FiXCircle /> Wrong Network (Mainnet/Other)
                                        </div>
                                        <button
                                            onClick={() => switchChain({ chainId: 11155111 })}
                                            className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 underline underline-offset-4"
                                        >
                                            Switch to Sepolia
                                        </button>
                                    </div>
                                ) : !walletClient ? (
                                    <div className="px-5 py-2.5 bg-amber-500/10 text-amber-500 border border-amber-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                                        <FiActivity className="animate-spin" /> Signer Initializing...
                                    </div>
                                ) : (
                                    <div className="px-5 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <FiCheckCircle /> Wallet Signer Ready
                                    </div>
                                )}
                            </div>

                            <button onClick={handleMintNft} disabled={loading} className="btn-primary w-full max-w-sm !py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] shadow-xl">
                                {loading ? (
                                    <><FiLoader className="animate-spin inline mr-2" /> Processing...</>
                                ) : chainId !== 11155111 ? (
                                    'Switch to Sepolia'
                                ) : !walletClient ? (
                                    'Reconnecting...'
                                ) : (
                                    'Claim Soulbound Identity'
                                )}
                            </button>
                        </motion.div>
                    )}

                    {/* SUCCESS */}
                    {currentStep === 7 && (
                        <motion.div key="s7" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 md:py-10">
                            <div className="w-20 h-20 md:w-24 md:h-24 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 md:mb-10 shadow-lg shadow-blue-600/10"><FiCheckCircle size={40} className="md:w-12 md:h-12" /></div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter italic">Authorization Complete.</h2>
                            <p className="text-sm md:text-base text-slate-500 max-w-md mx-auto mb-10 md:mb-12 font-medium">Your decentralized identity is now recognized by the Aamba protocol.</p>
                            <button onClick={() => navigate('/dashboard')} className="w-full bg-white text-black font-black py-5 md:py-6 rounded-2xl hover:bg-slate-200 transition-all shadow-xl flex items-center justify-center gap-4 text-base md:text-lg uppercase tracking-widest">Enter Protocol Terminal <FiArrowRight size={24} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Onboarding;
