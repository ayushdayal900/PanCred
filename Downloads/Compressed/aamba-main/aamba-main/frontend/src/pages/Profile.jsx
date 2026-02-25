import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    FiUser,
    FiShield,
    FiAward,
    FiActivity,
    FiExternalLink,
    FiCopy,
    FiStar,
    FiCheckCircle
} from 'react-icons/fi';
import { useAccount } from 'wagmi';
import { checkIdentityOwnership } from '../blockchainService';
import addresses from '../contracts/addresses.json';
import trustScoreAbi from '../contracts/TrustScoreRegistry.json';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const IDENTITY_CONTRACT_ADDRESS = addresses.identity;

const Profile = () => {
    const { userProfile } = useAuth();
    const { address } = useAccount();

    const [hasNft, setHasNft] = useState(false);
    const [nftLoading, setNftLoading] = useState(true);
    const [onChainTrustScore, setOnChainTrustScore] = useState(0);

    const role = userProfile?.role || 'User';
    const walletAddr = address || userProfile?.walletAddress;

    useEffect(() => {
        const fetchChainData = async () => {
            if (walletAddr) {
                try {
                    const owned = await checkIdentityOwnership(walletAddr);
                    setHasNft(owned);

                    const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");

                    // Verify TrustScore contract code exists
                    const code = await provider.getCode(addresses.trustScore);
                    if (code !== "0x" && code !== "0x0") {
                        const trustContract = new ethers.Contract(addresses.trustScore, trustScoreAbi, provider);
                        const score = await trustContract.getTrustScore(walletAddr);
                        setOnChainTrustScore(Number(score));
                    } else {
                        console.warn("[Profile] TrustScore Registry not found on-chain. Skipping score fetch.");
                    }
                } catch (err) {
                    console.error("Chain Data fetch error:", err);
                } finally {
                    setNftLoading(false);
                }
            } else {
                setNftLoading(false);
            }
        };
        fetchChainData();

        const interval = setInterval(fetchChainData, 10000);
        return () => clearInterval(interval);
    }, [walletAddr]);

    const copyAddress = (addr) => {
        navigator.clipboard.writeText(addr);
        toast.success("Address copied to clipboard");
    };

    return (
        <div className="space-y-8 md:space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">Protocol Identity</h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium">Your decentralized reputation across the Aamba network.</p>
                </div>
                <div className="w-full md:w-auto bg-fintech-surface border border-fintech-border p-5 md:px-6 md:py-4 rounded-[2rem] flex items-center justify-between md:justify-start gap-6 shadow-xl">
                    <div className="md:text-right">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">On-Chain Score</p>
                        <p className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">{onChainTrustScore}</p>
                    </div>
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/5 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
                        <FiAward size={28} />
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6 md:space-y-10">
                    <section className="premium-card !p-8 md:!p-10 relative overflow-hidden">
                        <div className="flex items-center gap-3 text-slate-500 mb-8 md:mb-10">
                            <FiUser className="text-blue-500" />
                            <span className="text-[9px] uppercase font-black tracking-widest">Authorized Entity Details</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                            <div className="space-y-1">
                                <label className="block text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mb-2 px-1">Legal Identifier</label>
                                <p className="text-xl md:text-2xl font-black text-white italic tracking-tight truncate px-1">{userProfile?.name || 'Protocol User'}</p>
                                <p className="text-xs md:text-sm text-slate-500 font-medium px-1 truncate">{userProfile?.email}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mb-2 px-1">Wallet Anchor</label>
                                <div className="flex items-center gap-3 bg-fintech-dark p-3 rounded-xl border border-slate-900 shadow-inner">
                                    <p className="font-mono text-[10px] md:text-xs text-slate-400 truncate flex-1">{walletAddr}</p>
                                    <button onClick={() => copyAddress(walletAddr)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all active:scale-95">
                                        <FiCopy size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="block text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mb-2 px-1">Active Protocol Role</label>
                                <div className="inline-flex items-center gap-4 bg-emerald-500/5 border border-emerald-500/10 px-5 py-3 rounded-2xl">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <p className="text-base md:text-lg font-black text-white uppercase tracking-widest italic">{role}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="premium-card !p-8 md:!p-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 md:mb-12">
                            <div className="flex items-center gap-3">
                                <FiStar className="text-blue-500" />
                                <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Trust Progression</span>
                            </div>
                            <span className="bg-slate-900 text-blue-500 text-[9px] md:text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest border border-blue-500/10 shadow-lg w-fit">
                                Tier: {onChainTrustScore >= 300 ? 'Gold Elite' : onChainTrustScore >= 100 ? 'Silver Verified' : 'Bronze Pilot'}
                            </span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-600 px-1">
                                <span>Network Strength</span>
                                <span className="text-white italic">{onChainTrustScore} / 1000 pts</span>
                            </div>
                            <div className="h-5 w-full bg-slate-950 rounded-full p-1 border border-slate-900 shadow-inner relative overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(onChainTrustScore / 1000) * 100}%` }}
                                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full shadow-lg shadow-blue-600/30 relative"
                                >
                                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 animate-pulse"></div>
                                </motion.div>
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                                <FiActivity className="text-slate-600 flex-shrink-0 mt-0.5" size={14} />
                                <p className="text-[10px] md:text-xs text-slate-500 font-medium italic leading-relaxed">System Note: Your reputation score is recalculated on-chain after every repayment. Higher scores unlock increased capital ceilings and lower fee structures.</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar */}
                <aside className="space-y-6 md:space-y-10">
                    <div className="premium-card !p-10 text-center">
                        <div className={`w-24 h-24 md:w-32 md:h-32 mx-auto mb-8 rounded-[2.5rem] flex items-center justify-center border-2 transition-all duration-1000 ${hasNft ? 'bg-blue-600/5 border-blue-600/30 text-blue-500 shadow-2xl' : 'bg-slate-950 border-slate-900 text-slate-800'}`}>
                            <FiShield size={hasNft ? 56 : 48} className={hasNft ? 'drop-shadow-md' : ''} />
                        </div>
                        <h4 className="text-2xl font-black text-white mb-2 italic tracking-tighter">AAMBA ID</h4>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-10">Protocol Soulbound NFT</p>

                        <div className="flex justify-center mb-10">
                            {nftLoading ? (
                                <FiActivity className="animate-spin text-blue-500" />
                            ) : (
                                <div className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg ${hasNft ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-900 text-slate-600 border border-slate-800'}`}>
                                    {hasNft ? <><FiCheckCircle /> Authorized</> : 'Not Detected'}
                                </div>
                            )}
                        </div>

                        {hasNft && (
                            <div className="pt-8 border-t border-slate-900">
                                <a
                                    href={`https://sepolia.etherscan.io/address/${IDENTITY_CONTRACT_ADDRESS}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                                >
                                    Etherscan Evidence <FiExternalLink size={12} />
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="premium-card !p-8 space-y-8">
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] px-1">Protocol Registry</p>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-[8px] text-slate-700 font-black uppercase tracking-widest px-1">Identity Gateway</p>
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 group transition-all hover:border-blue-500/30">
                                    <p className="text-[10px] font-mono text-slate-500 truncate group-hover:text-slate-300 transition-colors">{addresses.identity}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[8px] text-slate-700 font-black uppercase tracking-widest px-1">Reputation Engine</p>
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 group transition-all hover:border-blue-500/30">
                                    <p className="text-[10px] font-mono text-slate-500 truncate group-hover:text-slate-300 transition-colors">{addresses.trustScore}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default Profile;
