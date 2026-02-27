import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiLoader, FiArrowLeft, FiShield, FiArrowRight, FiCheckCircle, FiKey } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { checkIdentityOwnership } from '../blockchainService';
import toast from 'react-hot-toast';
import axios from 'axios';

const SignIn = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated, userProfile } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Cooldown timer logic
    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setInterval(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleSendOTP = async () => {
        if (!email) return toast.error('Enter email first');
        setLoading(true);
        const tid = toast.loading('Sending security code...');
        try {
            const response = await axios.post('http://localhost:5000/auth/send-otp', { email });
            if (response.data.success) {
                toast.success('OTP sent to your email', { id: tid });
                setShowOTP(true);
                setResendCooldown(30);
            } else {
                toast.error(response.data.message || 'Failed to send OTP', { id: tid });
            }
        } catch (err) {
            toast.error('Service unavailable. Try again.', { id: tid });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) return toast.error('Enter 6-digit code');
        setLoading(true);
        const tid = toast.loading('Verifying code...');
        try {
            const response = await axios.post('http://localhost:5000/auth/verify-otp', { email, otp });
            if (response.data.verified) {
                toast.success('Identity Anchor Verified!', { id: tid });
                setEmailVerified(true);
            } else {
                toast.error(response.data.message || 'Invalid code', { id: tid });
            }
        } catch (err) {
            toast.error('Verification failed', { id: tid });
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!emailVerified) {
            return toast.error('Please verify your email with OTP first.');
        }

        setLoading(true);
        const tid = toast.loading('Synchronizing with protocol...');
        try {
            const result = await login(email, password);
            if (result.success) {
                toast.success('Authorized. Aligning identity...', { id: tid });

                // Check if they need onboarding or can go to dashboard
                // A user is fully onboarded if their KYC status is 'Verified' in the database
                const profile = result.user || userProfile;

                // Also check if they have a wallet address and soulbound token on-chain
                const walletAddress = profile?.walletAddress || localStorage.getItem('walletAddress');

                let isOnboarded = profile?.kycStatus === 'Verified';

                // If DB says not verified but we have a wallet, double check on-chain just in case
                if (!isOnboarded && walletAddress) {
                    toast.loading('Checking on-chain Soulbound ID...', { id: tid });
                    isOnboarded = await checkIdentityOwnership(walletAddress);
                }

                if (isOnboarded) {
                    localStorage.setItem("isOnboarded", "true");
                    navigate('/dashboard');
                } else {
                    localStorage.removeItem("isOnboarded");
                    navigate('/onboarding');
                }
            } else {
                toast.error(result.message || 'Login failed', { id: tid });
            }
        } catch (err) {
            toast.error('Connection error.', { id: tid });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-fintech-dark flex flex-col items-center justify-center px-4 md:px-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] aspect-square bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] aspect-square bg-fintech-accent/5 rounded-full blur-[120px]"></div>
            </div>

            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 md:top-10 md:left-10 text-slate-500 hover:text-white flex items-center gap-2 transition-colors text-[10px] font-black uppercase tracking-widest group"
            >
                <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Exit to Terminal
            </button>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-10 md:mb-12">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-fintech-surface border border-fintech-border text-blue-500 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-2xl">
                        <FiShield size={32} className="md:w-10 md:h-10" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter italic">Authorize Access</h2>
                    <p className="text-sm md:text-base text-slate-500 font-medium font-sans italic">Enter your protocol credentials to continue.</p>
                </div>

                <div className="premium-card !p-6 md:!p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {!showOTP && (
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3 px-1">Email Anchor</label>
                                    <div className="relative">
                                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                        <input
                                            type="email"
                                            required
                                            className="w-full bg-fintech-dark border border-fintech-border rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-800 shadow-inner text-sm"
                                            placeholder="you@protocol.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3 px-1">Secure Keyphrase</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                        <input
                                            type="password"
                                            required
                                            className="w-full bg-fintech-dark border border-fintech-border rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-800 shadow-inner text-sm"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSendOTP}
                                    disabled={loading}
                                    className="btn-primary w-full !py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl"
                                >
                                    {loading ? <FiLoader className="animate-spin" /> : <><FiKey size={18} /> Initialize MFA Verification</>}
                                </button>
                            </div>
                        )}

                        {showOTP && !emailVerified && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 py-2">
                                <div className="text-center">
                                    <p className="text-xs text-blue-500 font-black uppercase tracking-widest mb-2">MFA Required</p>
                                    <p className="text-slate-400 text-[11px] font-medium italic">Sent to <span className="text-white">{email}</span></p>
                                </div>
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-5 text-2xl font-mono tracking-[0.5em] text-white text-center outline-none focus:border-blue-600 transition-all shadow-inner"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowOTP(false)}
                                        className="py-4 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleVerifyOTP}
                                        disabled={loading}
                                        className="py-4 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20"
                                    >
                                        Verify
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {emailVerified && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                                    <FiCheckCircle className="text-emerald-500 shrink-0" size={20} />
                                    <div className="text-left">
                                        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">MFA Clear</p>
                                        <p className="text-white text-[11px] font-medium truncate">{email}</p>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full !py-6 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 bg-blue-600 shadow-xl animate-pulse hover:animate-none"
                                >
                                    {loading ? <FiLoader className="animate-spin" /> : <>Finalize Authorization <FiArrowRight size={18} /></>}
                                </button>
                            </motion.div>
                        )}
                    </form>

                    <div className="mt-8 md:mt-10 pt-8 border-t border-slate-900 text-center">
                        <p className="text-slate-500 text-xs font-medium italic">
                            New protocol entity? <button onClick={() => navigate('/signup')} className="text-blue-500 hover:text-blue-400 font-black ml-1 transition-colors uppercase tracking-widest">Generate Identity</button>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SignIn;
