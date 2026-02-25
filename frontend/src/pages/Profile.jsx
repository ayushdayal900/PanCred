import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    FiUser,
    FiShield,
    FiMail,
    FiPocket,
    FiCheckCircle,
    FiAward,
    FiActivity,
    FiCopy,
    FiExternalLink
} from 'react-icons/fi';
import { useAccount, useConfig } from 'wagmi';
import { checkIdentityOwnership } from '../blockchainService';
import addresses from '../contracts/addresses.json';

const IDENTITY_CONTRACT_ADDRESS = addresses.identity;

const Profile = () => {
    const { userProfile } = useAuth();
    const { address, isConnected } = useAccount();
    const config = useConfig();

    const [hasNft, setHasNft] = useState(false);
    const [nftLoading, setNftLoading] = useState(true);

    const role = localStorage.getItem("userRole") || userProfile?.role || 'Unassigned';
    const walletAddr = address || localStorage.getItem("walletAddress") || userProfile?.walletAddress;

    useEffect(() => {
        const checkNft = async () => {
            if (walletAddr) {
                try {
                    const owned = await checkIdentityOwnership(walletAddr);
                    setHasNft(owned);
                } catch (err) {
                    console.error("NFT Check error:", err);
                } finally {
                    setNftLoading(false);
                }
            } else {
                setNftLoading(false);
            }
        };
        checkNft();
    }, [walletAddr]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    const StatusBadge = ({ status, type }) => {
        let colors = "bg-slate-800 text-slate-400"; // Gray = Pending
        if (type === 'verified') colors = "bg-green-500/20 text-green-400 border border-green-500/30";
        if (type === 'on-chain') colors = "bg-blue-500/20 text-blue-400 border border-blue-500/30";

        return (
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${colors}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-fintech-dark pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
                >
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2">Protocol Profile</h1>
                        <p className="text-slate-400">Manage your decentralized identity and trust parameters.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-fintech-card border border-fintech-border px-6 py-3 rounded-2xl flex items-center gap-3">
                            <FiAward className="text-fintech-warning" size={24} />
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Trust Score</p>
                                <p className="text-xl font-black text-white">{userProfile?.trustScore || 300}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Primary Identity */}
                    <div className="md:col-span-2 space-y-8">
                        <div className="bg-fintech-card border border-fintech-border rounded-[2rem] p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-fintech-accent/5 rounded-bl-full"></div>

                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <FiUser className="text-fintech-accent" /> Basic Information
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Account Name</label>
                                    <p className="text-lg text-white font-semibold">{userProfile?.name || 'Protocol User'}</p>
                                </div>

                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Email Address</label>
                                    <div className="flex items-center gap-3">
                                        <p className="text-lg text-white font-semibold">{userProfile?.email || 'N/A'}</p>
                                        <StatusBadge status="Verified" type="verified" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Protocol Role</label>
                                    <div className="flex items-center gap-3">
                                        <FiActivity className="text-fintech-accent" />
                                        <p className="text-lg text-white font-bold">{role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-fintech-card border border-fintech-border rounded-[2rem] p-8">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <FiPocket className="text-fintech-accent" /> Web3 Identity
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Connected Wallet</label>
                                    <div className="bg-fintech-dark/50 border border-fintech-border rounded-xl p-4 flex items-center justify-between">
                                        <p className="text-sm font-mono text-slate-300 truncate mr-4">{walletAddr || 'Not Connected'}</p>
                                        <button
                                            onClick={() => copyToClipboard(walletAddr)}
                                            className="text-slate-500 hover:text-white transition-colors"
                                        >
                                            <FiCopy />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <div className="p-4 bg-fintech-dark/30 rounded-2xl border border-fintech-border">
                                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Aadhaar Status</label>
                                        <div className="flex items-center gap-2">
                                            <FiCheckCircle className="text-green-500" />
                                            <span className="text-sm font-bold text-white">Verified</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-fintech-dark/30 rounded-2xl border border-fintech-border">
                                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Liveliness</label>
                                        <div className="flex items-center gap-2">
                                            <FiCheckCircle className="text-green-500" />
                                            <span className="text-sm font-bold text-white">Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: NFT & Contracts */}
                    <div className="space-y-8">
                        <div className="bg-fintech-card border border-fintech-border rounded-[2rem] p-8 text-center relative group">
                            <div className="absolute inset-0 bg-fintech-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10">
                                <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center border-2 transition-all duration-700 ${hasNft ? 'bg-fintech-accent/20 border-fintech-accent text-fintech-accent shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'bg-slate-800/50 border-slate-700 text-slate-600'}`}>
                                    <FiShield size={48} />
                                </div>
                                <h4 className="text-xl font-bold text-white mb-2">Soulbound ID</h4>
                                <p className="text-sm text-slate-500 mb-6">Non-transferable on-chain identity token.</p>

                                {nftLoading ? (
                                    <div className="flex justify-center"><FiActivity className="animate-spin text-fintech-accent" /></div>
                                ) : (
                                    <StatusBadge
                                        status={hasNft ? "Verified on Ethereum" : "Not Minted"}
                                        type={hasNft ? "on-chain" : "pending"}
                                    />
                                )}

                                {hasNft && (
                                    <div className="mt-6 flex justify-center">
                                        <a
                                            href={`https://sepolia.etherscan.io/address/${IDENTITY_CONTRACT_ADDRESS}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-fintech-accent flex items-center gap-2 hover:underline"
                                        >
                                            View Contract <FiExternalLink />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-fintech-card border border-fintech-border rounded-[2rem] p-8">
                            <h4 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">Protocol Anchors</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] text-slate-600 font-bold uppercase block mb-1">Identity Protocol</label>
                                    <p className="text-[10px] font-mono text-slate-400 break-all bg-fintech-dark/50 p-2 rounded-lg">{IDENTITY_CONTRACT_ADDRESS}</p>
                                </div>
                                <div>
                                    <label className="text-[9px] text-slate-600 font-bold uppercase block mb-1">Aamba Core v1.0</label>
                                    <p className="text-[10px] font-mono text-slate-400 break-all bg-fintech-dark/50 p-2 rounded-lg">Coming Soon</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
