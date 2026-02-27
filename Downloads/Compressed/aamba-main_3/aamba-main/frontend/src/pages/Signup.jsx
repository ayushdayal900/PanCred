import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiArrowRight, FiShield, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import axios from 'axios';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    // OTP Related States
    const [showOTP, setShowOTP] = useState(false);
    const [otp, setOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const { register } = useAuth();
    const navigate = useNavigate();

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
        setLocalLoading(true);
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
            setLocalLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) return toast.error('Enter 6-digit code');

        setLocalLoading(true);
        const tid = toast.loading('Verifying code...');
        try {
            const response = await axios.post('http://localhost:5000/auth/verify-otp', { email, otp });
            if (response.data.verified) {
                toast.success('Email verified successfully!', { id: tid });
                setEmailVerified(true);
            } else {
                toast.error(response.data.message || 'Invalid code', { id: tid });
            }
        } catch (err) {
            toast.error('Verification failed', { id: tid });
        } finally {
            setLocalLoading(false);
        }
    };

    const handleResendOTP = () => {
        if (resendCooldown === 0) {
            handleSendOTP();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!emailVerified) {
            await handleSendOTP();
            return;
        }

        setLocalLoading(true);
        const tid = toast.loading('Initializing protocol registration...');

        try {
            const result = await register(name, email, password);
            if (result.success) {
                toast.success('Identity Created! Opening gateway...', { id: tid });

                // If they registered with an email that already had a complete profile
                const profile = result.user;
                if (profile?.kycStatus === 'Verified') {
                    localStorage.setItem("isOnboarded", "true");
                    navigate('/dashboard');
                } else {
                    localStorage.removeItem("isOnboarded");
                    navigate('/onboarding');
                }
            } else {
                toast.error(result.message, { id: tid });
            }
        } catch (err) {
            toast.error('Registration failed. Check network.', { id: tid });
        } finally {
            setLocalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-fintech-dark flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] aspect-square bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8 md:mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-fintech-surface border border-fintech-border text-blue-500 rounded-[2rem] mb-6 md:mb-8 shadow-xl">
                        <FiShield size={32} className="md:w-9 md:h-9" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter italic">Initialize Identity</h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium tracking-tight font-sans italic">Step into the decentralized financial ecosystem.</p>
                </div>

                <div className="premium-card !p-6 md:!p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                        {!showOTP && (
                            <AnimatePresence>
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 md:space-y-6">
                                    <div>
                                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3 px-1">Full Legal Name</label>
                                        <div className="relative">
                                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-fintech-dark border border-fintech-border rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder:text-slate-800 shadow-inner text-sm"
                                                placeholder="John Doe"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-3 px-1">Email Anchor</label>
                                        <div className="relative">
                                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                                            <input
                                                type="email"
                                                required
                                                className="w-full bg-fintech-dark border border-fintech-border rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder:text-slate-800 shadow-inner text-sm"
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
                                                className="w-full bg-fintech-dark border border-fintech-border rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder:text-slate-800 shadow-inner text-sm"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        )}

                        {showOTP && !emailVerified && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 py-4">
                                <div className="text-center">
                                    <p className="text-xs text-blue-500 font-black uppercase tracking-widest mb-2">Verification Required</p>
                                    <p className="text-slate-400 text-[11px] font-medium italic">We've sent a 6-digit code to <span className="text-white">{email}</span></p>
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
                                        onClick={handleResendOTP}
                                        disabled={localLoading || resendCooldown > 0}
                                        className="py-4 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleVerifyOTP}
                                        disabled={localLoading}
                                        className="py-4 bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all"
                                    >
                                        Verify OTP
                                    </button>
                                </div>
                                <button type="button" onClick={() => setShowOTP(false)} className="w-full text-[9px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-500 transition-all italic">Change Email Address</button>
                            </motion.div>
                        )}

                        {emailVerified && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                                <FiCheckCircle className="text-emerald-500 shrink-0" size={20} />
                                <div className="text-left">
                                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Email Verified</p>
                                    <p className="text-white text-[11px] font-medium truncate">{email}</p>
                                </div>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={localLoading || (showOTP && !emailVerified)}
                            className="btn-primary w-full !py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] group shadow-xl"
                        >
                            {localLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                            ) : (
                                <>
                                    {emailVerified ? 'Complete Protocol Registration' : 'Initialize Verification'}
                                    <FiArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-900 text-center">
                        <p className="text-slate-500 text-xs md:text-sm font-medium italic">
                            Already authorized? <Link to="/signin" className="text-blue-500 hover:text-blue-400 font-bold ml-1 transition-colors uppercase tracking-widest">Sign In</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-10 md:mt-12 flex justify-center gap-8 md:gap-10 opacity-40">
                    <div className="flex items-center gap-2">
                        <FiShield className="text-blue-500" />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500 italic font-medium">Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-500 italic font-medium">Web3 Ready</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;

