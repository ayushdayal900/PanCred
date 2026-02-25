import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPocket, FiLoader, FiArrowLeft, FiShield, FiActivity, FiKey } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConfig } from 'wagmi';
import toast from 'react-hot-toast';

const SignIn = () => {
    const navigate = useNavigate();
    const { walletLogin, userProfile, isAuthenticated } = useAuth();
    const { address, isConnected: walletConnected } = useAccount();

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        console.log("--- SignIn Debug ---");
        console.log("Wallet Connected:", walletConnected);
        console.log("Address:", address);
        console.log("Authenticated:", isAuthenticated);
    }, [walletConnected, address, isAuthenticated]);

    const handleProtocolLogin = async () => {
        if (walletConnected && address) {
            const tid = toast.loading('Synchronizing with protocol...');
            try {
                setLoading(true);
                // 1. Backend Login
                const loginResult = await walletLogin(address);
                if (!loginResult.success) {
                    throw new Error("Authorization rejected.");
                }

                toast.success('Authorized. Aligning identity...', { id: tid });

                // Redirection will be handled by App.jsx or we can do it here
                const isOnboarded = localStorage.getItem("isOnboarded") === "true";
                if (isOnboarded) {
                    navigate('/dashboard');
                } else {
                    navigate('/onboarding');
                }
            } catch (err) {
                toast.error(err.message || 'Verification failed.', { id: tid });
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-fintech-dark flex items-center justify-center px-4 md:px-6 relative overflow-hidden">
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
                    <p className="text-sm md:text-base text-slate-500 font-medium font-sans italic">Connect your wallet to anchor your protocol identity.</p>
                </div>

                <div className="premium-card !p-6 md:!p-8">
                    <ConnectButton.Custom>
                        {({
                            account,
                            chain,
                            openConnectModal,
                            openChainModal,
                            mounted,
                        }) => {
                            const ready = mounted;
                            const connected = ready && account && chain;

                            return (
                                <div
                                    {...(!ready && {
                                        'aria-hidden': true,
                                        'style': {
                                            opacity: 0,
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                        },
                                    })}
                                >
                                    {(() => {
                                        if (!connected) {
                                            return (
                                                <button
                                                    onClick={openConnectModal}
                                                    type="button"
                                                    className="btn-primary w-full !py-6 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-xl"
                                                >
                                                    <FiPocket size={20} /> Establish Connection
                                                </button>
                                            );
                                        }

                                        if (chain.unsupported) {
                                            return (
                                                <button
                                                    onClick={openChainModal}
                                                    type="button"
                                                    className="w-full bg-red-600/20 border border-red-600/50 text-red-500 font-black py-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all text-[10px] uppercase tracking-widest"
                                                >
                                                    Unsupported Protocol Net
                                                </button>
                                            );
                                        }

                                        return (
                                            <div className="space-y-6">
                                                <div className="p-5 md:p-6 bg-slate-950 rounded-2xl border border-slate-900 flex items-center justify-between shadow-inner">
                                                    <div className="text-left overflow-hidden">
                                                        <p className="text-[8px] md:text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Vault Linked</p>
                                                        <p className="text-white font-black truncate italic">{account.displayName}</p>
                                                    </div>
                                                    <div className="w-12 h-12 flex-shrink-0 bg-blue-600/5 rounded-xl flex items-center justify-center text-blue-500 shadow-md">
                                                        <FiActivity />
                                                    </div>
                                                </div>

                                                {/* Explicit Login Step */}
                                                {
                                                    !isAuthenticated && (
                                                        <button
                                                            onClick={handleProtocolLogin}
                                                            disabled={loading}
                                                            className="btn-primary w-full !py-6 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 bg-blue-600 shadow-lg shadow-blue-600/20 animate-pulse hover:animate-none"
                                                        >
                                                            {loading ? <FiLoader className="animate-spin" /> : <><FiKey size={20} /> Finalize Protocol Authorization</>}
                                                        </button>
                                                    )
                                                }

                                                {
                                                    isAuthenticated && (
                                                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                                                            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Protocol Sync Active</p>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        }}
                    </ConnectButton.Custom>

                    <div className="mt-8 md:mt-10 pt-8 border-t border-slate-900 text-center">
                        <p className="text-slate-500 text-xs font-medium italic">
                            New protocol entity? <button onClick={() => navigate('/signup')} className="text-blue-500 hover:text-blue-400 font-black ml-1 transition-colors uppercase tracking-widest">Generate Identity</button>
                        </p>
                    </div>
                </div>
            </motion.div >
        </div >
    );
};

export default SignIn;
