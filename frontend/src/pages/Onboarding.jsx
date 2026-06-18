import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import '@aws-amplify/ui-react/styles.css';

const LIVENESS_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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

const MockLivenessScanner = ({ sessionId, onComplete, onCancel }) => {
    const videoRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('Position your face inside the oval');
    const [stream, setStream] = useState(null);

    useEffect(() => {
        let activeStream = null;
        async function startCamera() {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                activeStream = s;
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
            } catch (err) {
                console.warn("Camera access not available or denied. Rendering simulated avatar scanning.");
            }
        }
        startCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    onComplete(sessionId);
                    return 100;
                }
                const next = p + 2;
                if (next > 80) {
                    setStatusText('Verifying patterns...');
                } else if (next > 40) {
                    setStatusText('Analyzing biometric indicators...');
                } else if (next > 15) {
                    setStatusText('Hold still...');
                }
                return next;
            });
        }, 80);

        return () => clearInterval(interval);
    }, [onComplete, sessionId]);

    return (
        <div className="mx-auto w-full max-w-md p-6 rounded-2xl flex flex-col items-center shadow-xl border" 
             style={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}>
            <div className="flex justify-between items-center w-full mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2.5 py-1 rounded-full border border-blue-900 animate-pulse">Developer Sandbox Bypass</span>
                <button onClick={onCancel} className="text-slate-400 hover:text-white text-xs transition-colors">Cancel</button>
            </div>
            <h4 className="text-base font-bold mb-1 text-center">Simulated Biometric Check</h4>
            <p className="text-xs text-slate-400 text-center mb-6">{statusText}</p>

            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-950 flex items-center justify-center">
                {stream ? (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="absolute w-full h-full object-cover scale-x-[-1]"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <FiUser size={48} className="animate-pulse mb-2 text-slate-400" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Camera Bypass Active</span>
                    </div>
                )}

                {/* Animated Pulsing Scanning Oval */}
                <div 
                    className="absolute inset-x-8 inset-y-6 rounded-[50%/60%] border-4 border-dashed animate-pulse" 
                    style={{ 
                        borderColor: progress > 80 ? '#10b981' : '#3b82f6',
                        boxShadow: `0 0 15px ${progress > 80 ? '#10b981' : '#3b82f6'}`
                    }}
                />

                {/* Scan Overlay Laser Line */}
                <div 
                    className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70"
                    style={{
                        top: `${progress}%`,
                        backgroundColor: progress > 80 ? '#10b981' : '#3b82f6',
                        boxShadow: `0 0 10px ${progress > 80 ? '#10b981' : '#3b82f6'}`,
                        transition: 'top 0.08s linear'
                    }}
                />
            </div>

            {/* Progress Bar */}
            <div className="w-full mt-6 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-75"
                    style={{ 
                        width: `${progress}%`,
                        backgroundColor: progress > 80 ? '#10b981' : '#3b82f6'
                    }}
                />
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">{Math.round(progress)}% Complete</span>
        </div>
    );
};

const Onboarding = () => {
    const { userProfile, updateRole, submitKyc, logout } = useAuth();
    const navigate = useNavigate();
    const { address, isConnected: walletConnected, chainId } = useAccount();
    const config = useConfig();
    const { data: walletClient, status: walletClientStatus } = useWalletClient();
    const { switchChain } = useSwitchChain();

    // Namespace sessionStorage by userId so different users get independent progress
    const userId = userProfile?._id || 'guest';
    const stepKey = `onboarding_step_${userId}`;
    const aadhaarKey = `onboarding_aadhaar_${userId}`;

    // Restore step from sessionStorage on refresh (cleared after completion)
    // Extra guard: if stored step is 7 but not yet onboarded, reset to 2
    const rawSavedStep = parseInt(sessionStorage.getItem(stepKey) || '2', 10);
    const isOnboardedFlag = localStorage.getItem('isOnboarded') === 'true';
    const savedStep = rawSavedStep === 7 && !isOnboardedFlag ? 2 : rawSavedStep;
    const [currentStep, setCurrentStepRaw] = useState(savedStep);
    const [loading, setLoading] = useState(false);
    const [walletConfirmed, setWalletConfirmed] = useState(false);

    // Wrapped setter that also persists to sessionStorage
    const setCurrentStep = (step) => {
        sessionStorage.setItem(stepKey, String(step));
        setCurrentStepRaw(step);
    };

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
        const confirmExit = window.confirm("Are you sure you want to exit? Your setup progress will be reset.");
        if (confirmExit) {
            localStorage.removeItem("isOnboarded");
            navigate('/signin');
        }
    };

    const [role, setRole] = useState('');
    const [aadhaar, setAadhaar] = useState(
        () => sessionStorage.getItem(aadhaarKey) || ''
    );
    const [txnHash, setTxnHash] = useState('');

    // Liveness detection state
    const [livenessSessionId, setLivenessSessionId] = useState(null);
    const [livenessPhase, setLivenessPhase] = useState('idle'); // idle | loading | detecting | done | error
    const [livenessError, setLivenessError] = useState('');
    const [livenessCredentials, setLivenessCredentials] = useState(null);

    // Persist aadhaar to sessionStorage whenever it changes
    useEffect(() => {
        if (aadhaar) sessionStorage.setItem(aadhaarKey, aadhaar);
    }, [aadhaar]);

    const progress = ((currentStep - 1) / 6) * 100;

    const steps = [
        { id: 2, title: 'Role', icon: <FiBriefcase size={15} /> },
        { id: 3, title: 'Identity', icon: <FiShield size={15} /> },
        { id: 4, title: 'Biometrics', icon: <FiCamera size={15} /> },
        { id: 5, title: 'Wallet', icon: <FiPocket size={15} /> },
        { id: 6, title: 'Mint', icon: <FiCreditCard size={15} /> },
        { id: 7, title: 'Done', icon: <FiCheckCircle size={15} /> },
    ];

    const handleRoleSelect = async (selectedRole) => {
        setRole(selectedRole);
        setLoading(true);
        const tid = toast.loading(`Setting role: ${selectedRole}...`);
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

    // ── AWS Rekognition Liveness ───────────────────────────────────────────────
    const startLivenessSession = useCallback(async () => {
        setLivenessPhase('loading');
        setLivenessError('');
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}')?.token;
            // Create session and fetch credentials in parallel
            const [sessionRes, credRes] = await Promise.all([
                fetch(`${LIVENESS_API}/api/liveness/create-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                }),
                fetch(`${LIVENESS_API}/api/liveness/credentials`, {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            const sessionData = await sessionRes.json();
            if (!sessionRes.ok) throw new Error(sessionData.message || 'Failed to create session');

            if (credRes.ok) {
                const credData = await credRes.json();
                setLivenessCredentials(credData.credentials);
            }

            setLivenessSessionId(sessionData.sessionId);
            
            if (sessionData.sessionId && sessionData.sessionId.startsWith('mock-')) {
                setLivenessPhase('mock-detecting');
            } else {
                setLivenessPhase('detecting');
            }
        } catch (e) {
            setLivenessError(e.message);
            setLivenessPhase('error');
        }
    }, []);

    const handleLivenessComplete = useCallback(async (forcedSessionId) => {
        setLivenessPhase('loading');
        const activeSessionId = forcedSessionId || livenessSessionId;
        const tid = toast.loading('Verifying biometric markers...');
        try {
            const token = JSON.parse(localStorage.getItem('userInfo') || '{}')?.token;
            const res = await fetch(`${LIVENESS_API}/api/liveness/verify-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ sessionId: activeSessionId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Verification failed');

            if (data.success) {
                toast.success(`Liveness confirmed (${data.riskLevel})`, { id: tid });
                setLivenessPhase('done');
                setCurrentStep(5);
            } else {
                toast.error(`Check failed: ${data.riskLevel} (score ${data.confidenceScore?.toFixed(1)})`, { id: tid });
                setLivenessPhase('idle'); // allow retry
                setLivenessSessionId(null);
            }
        } catch (e) {
            toast.error(e.message, { id: tid });
            setLivenessPhase('error');
            setLivenessError(e.message);
        }
    }, [livenessSessionId]);

    const handleLivenessError = useCallback((err) => {
        console.error('[Liveness]', err);
        setLivenessError(err?.message || 'Camera or network error');
        setLivenessPhase('idle');
        setLivenessSessionId(null);
    }, []);

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
                const isOwner = await checkIdentityOwnership(address, provider);
                if (!isOwner) throw new Error("Identity verification failed on-chain.");
                toast.success('Identity Soulbound Successfully!', { id: tid });
            }

            localStorage.setItem("isOnboarded", "true");
            localStorage.setItem("walletAddress", address);
            localStorage.setItem("userRole", role || userProfile?.role);

            toast.loading('Finalizing protocol synchronization...', { id: tid });
            await submitKyc('Aadhaar', aadhaar, null, address, result.txHash || 'existing');

            // Clear persisted onboarding state on successful completion
            sessionStorage.removeItem(stepKey);
            sessionStorage.removeItem(aadhaarKey);
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
            const provider = walletClient ? new ethers.BrowserProvider(walletClient.transport) : null;
            checkIdentityOwnership(address, provider).then(hasNft => {
                if (hasNft) {
                    localStorage.setItem("isOnboarded", "true");
                    setCurrentStep(7);
                }
            });
        }
    }, [currentStep, address]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-start py-10 md:py-20 px-4 md:px-6 font-sans" style={{ backgroundColor: '#FFFFFF' }}>
            {/* Exit Button */}
            <button
                onClick={handleExitOnboarding}
                className="absolute top-6 left-5 md:top-8 md:left-8 flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-all group"
            >
                <FiXCircle size={16} className="group-hover:rotate-90 transition-transform duration-300" /> Exit Setup
            </button>

            {/* Stepper */}
            <div className="w-full max-w-3xl mb-10 md:mb-14 mt-8">
                <div className="flex justify-between items-center mb-4 overflow-x-auto pb-2 gap-4 md:gap-0">
                    {steps.map((s, idx) => (
                        <div key={s.id} className="flex flex-col items-center flex-shrink-0 min-w-[60px]">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${currentStep > s.id
                                    ? 'border-transparent text-white'
                                    : currentStep === s.id
                                        ? 'border-transparent text-white'
                                        : 'text-text-secondary'
                                }`}
                                style={{
                                    backgroundColor: currentStep >= s.id ? 'var(--brand-accent)' : '#F1F5F9',
                                    borderColor: currentStep >= s.id ? 'var(--brand-accent)' : '#E2E8F0',
                                    color: currentStep >= s.id ? 'white' : '#64748B',
                                }}>
                                {currentStep > s.id ? <FiCheckCircle size={15} /> : s.icon}
                            </div>
                            <span className="text-[10px] mt-2 font-semibold uppercase tracking-wider"
                                style={{ color: currentStep >= s.id ? 'var(--brand-accent)' : '#94A3B8' }}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: '#E2E8F0' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: 'var(--brand-accent)' }}
                    />
                </div>
            </div>

            {/* Step Content */}
            <div className="w-full max-w-2xl">
                <AnimatePresence mode="wait">
                    {/* ROLE */}
                    {currentStep === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="text-center">
                            <span className="section-label">Step 1 of 6</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">Choose Your Role</h2>
                            <p className="text-sm text-text-secondary mb-10">How will you participate in the PanCred protocol?</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                <button onClick={() => handleRoleSelect('Lender')}
                                    className="group p-7 rounded-2xl border-2 transition-all text-left hover:shadow-md"
                                    style={{ backgroundColor: 'var(--brand-light)', borderColor: 'var(--brand-light-border)' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-accent)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--brand-light-border)'}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all"
                                        style={{ backgroundColor: '#DBEAFE', color: 'var(--brand-accent)' }}>
                                        <FiBriefcase size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-text-primary mb-1.5">Lender</h3>
                                    <p className="text-sm text-text-secondary leading-relaxed">Deploy capital to secure, protocol-verified loan requests and earn transparent interest.</p>
                                </button>
                                <button onClick={() => handleRoleSelect('Borrower')}
                                    className="group p-7 rounded-2xl border-2 transition-all text-left hover:shadow-md"
                                    style={{ backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#9333EA'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E9D5FF'}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all"
                                        style={{ backgroundColor: '#EDE9FE', color: '#9333EA' }}>
                                        <FiUser size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-text-primary mb-1.5">Borrower</h3>
                                    <p className="text-sm text-text-secondary leading-relaxed">Obtain peer-to-peer capital backed by your on-chain reputation and verified identity.</p>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* IDENTITY */}
                    {currentStep === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="max-w-md mx-auto w-full">
                            <span className="section-label text-center block">Step 2 of 6</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-2 text-center">Aadhaar Verification</h2>
                            <p className="text-sm text-text-secondary text-center mb-8">We use decentralized verification to issue your Soulbound ID.</p>
                            <form onSubmit={handleAadhaarSubmit} className="space-y-5">
                                <div className="rounded-2xl p-7" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                                    <label className="block text-sm font-medium text-text-primary mb-2 text-center">12-Digit Aadhaar Number</label>
                                    <input
                                        type="text" maxLength={12} value={aadhaar}
                                        onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                                        placeholder="0000 0000 0000"
                                        className="form-input text-xl font-mono tracking-[0.3em] text-center !py-4"
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
                                    {loading ? <FiLoader className="animate-spin" size={16} /> : <>Continue to Biometrics <FiArrowRight size={16} /></>}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* LIVENESS */}
                    {currentStep === 4 && (
                        <motion.div key="s4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="text-center">
                            <span className="section-label">Step 3 of 6</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">Biometric Verification</h2>
                            <p className="text-sm text-text-secondary mb-8">Confirm your presence to anchor your identity on-chain.</p>

                            {livenessPhase === 'idle' && (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: 'var(--brand-light)' }}>
                                        <FiCamera size={40} style={{ color: 'var(--brand-accent)' }} />
                                    </div>
                                    <p className="text-sm text-text-secondary max-w-sm">AWS will prompt you to move your face into an oval. The check takes about 5 seconds.</p>
                                    <button onClick={startLivenessSession} className="btn-primary !px-10 !py-3.5">
                                        Start Liveness Check
                                    </button>
                                </div>
                            )}

                            {livenessPhase === 'loading' && (
                                <div className="flex flex-col items-center gap-4 py-10">
                                    <FiLoader size={40} className="animate-spin" style={{ color: 'var(--brand-accent)' }} />
                                    <p className="text-sm text-text-secondary animate-pulse">Initialising secure session…</p>
                                </div>
                            )}

                            {livenessPhase === 'detecting' && livenessSessionId && (
                                <div className="mx-auto w-full max-w-xl liveness-dark-wrapper">
                                    <FaceLivenessDetector
                                        key={livenessSessionId}
                                        sessionId={livenessSessionId}
                                        region={import.meta.env.VITE_AWS_REGION || 'us-east-1'}
                                        onAnalysisComplete={handleLivenessComplete}
                                        onError={handleLivenessError}
                                        displayText={{ hintMoveFaceToOvalText: 'Move face into the oval' }}
                                        {...(livenessCredentials ? { credentialProvider: async () => livenessCredentials } : {})}
                                    />
                                </div>
                            )}

                            {livenessPhase === 'mock-detecting' && livenessSessionId && (
                                <MockLivenessScanner
                                    sessionId={livenessSessionId}
                                    onComplete={handleLivenessComplete}
                                    onCancel={() => {
                                        setLivenessPhase('idle');
                                        setLivenessSessionId(null);
                                    }}
                                />
                            )}

                            {livenessPhase === 'error' && (
                                <div className="flex flex-col items-center gap-4 py-8">
                                    <p className="text-sm font-medium" style={{ color: '#DC2626' }}>{livenessError || 'Something went wrong'}</p>
                                    <button onClick={startLivenessSession} className="btn-primary !px-8 !py-3">
                                        Retry
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* WALLET */}
                    {currentStep === 5 && (
                        <motion.div key="s5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="text-center max-w-md mx-auto w-full">
                            <span className="section-label">Step 4 of 6</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">Connect Wallet</h2>
                            <p className="text-sm text-text-secondary mb-8">Anchor your verified identity to a Web3 wallet.</p>
                            <div className="rounded-2xl p-10 mb-5 flex flex-col items-center gap-6"
                                style={{ backgroundColor: '#F8FAFC', border: '2px dashed #E2E8F0' }}>
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--brand-light)' }}>
                                    <FiPocket size={32} style={{ color: 'var(--brand-accent)' }} />
                                </div>
                                <div className="w-full overflow-hidden flex justify-center">
                                    <ConnectButton />
                                </div>

                                {walletConnected && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={handleWalletConnectionProceed}
                                        className="btn-primary w-full !py-3.5"
                                    >
                                        Continue to Minting <FiArrowRight size={16} />
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* MINT */}
                    {currentStep === 6 && (
                        <motion.div key="s6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="text-center max-w-md mx-auto w-full">
                            <span className="section-label">Step 5 of 6</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">Mint Soulbound ID</h2>
                            <p className="text-sm text-text-secondary mb-8">Minting your immutable identity token on Ethereum Sepolia.</p>

                            <div className="rounded-2xl p-8 mb-6 flex flex-col items-center"
                                style={{ backgroundColor: 'var(--brand-light)', border: '1px solid var(--brand-light-border)' }}>
                                <FiShield size={56} style={{ color: 'var(--brand-accent)' }} className="mb-4" />
                                <h4 className="font-bold text-lg text-text-primary mb-1">PanCred ID</h4>
                                <p className="text-xs text-text-secondary font-mono mt-1 truncate w-full text-center">{address}</p>
                                {txnHash && (
                                    <div className="mt-5 p-3.5 rounded-xl w-full text-left"
                                        style={{ backgroundColor: '#DBEAFE', border: '1px solid #93C5FD' }}>
                                        <p className="text-xs font-semibold mb-1" style={{ color: '#1D4ED8' }}>Transaction Broadcasting</p>
                                        <a href={`https://sepolia.etherscan.io/tx/${txnHash}`} target="_blank" rel="noreferrer"
                                            className="text-xs font-mono flex items-center gap-1.5 hover:underline" style={{ color: 'var(--brand-accent)' }}>
                                            View on Explorer <FiExternalLink size={11} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="mb-5">
                                {chainId !== 11155111 ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="badge-warning flex items-center gap-2">
                                            <FiXCircle size={14} /> Wrong Network
                                        </div>
                                        <button onClick={() => switchChain({ chainId: 11155111 })}
                                            className="text-sm font-medium underline underline-offset-2" style={{ color: '#D97706' }}>
                                            Switch to Sepolia
                                        </button>
                                    </div>
                                ) : !walletClient ? (
                                    <div className="badge flex items-center gap-2 mx-auto w-fit animate-pulse">
                                        <FiActivity size={13} className="animate-spin" /> Signer Initializing...
                                    </div>
                                ) : (
                                    <div className="badge-success flex items-center gap-2 mx-auto w-fit">
                                        <FiCheckCircle size={13} /> Wallet Ready
                                    </div>
                                )}
                            </div>

                            <button onClick={handleMintNft} disabled={loading} className="btn-primary w-full max-w-sm !py-3.5">
                                {loading ? (
                                    <><FiLoader className="animate-spin" size={16} /> Processing...</>
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
                        <motion.div key="s7" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                                style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                                <FiCheckCircle size={40} style={{ color: '#16A34A' }} />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">Setup Complete!</h2>
                            <p className="text-sm text-text-secondary max-w-md mx-auto mb-10 leading-relaxed">
                                Your decentralized identity is now recognized by the PanCred protocol. Welcome aboard.
                            </p>
                            <button onClick={() => navigate('/dashboard')} className="btn-success !px-12 !py-3.5 text-base">
                                Go to Dashboard <FiArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Onboarding;
