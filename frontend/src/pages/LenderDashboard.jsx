import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { ethers } from 'ethers';
import { useAccount, useConfig } from 'wagmi';
import { getConnectorClient } from '@wagmi/core';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiLoader, FiTrendingUp, FiCheckCircle, FiInfo, FiSearch, FiGlobe } from 'react-icons/fi';

import addresses from '../contracts/addresses.json';
import microfinanceAbi from '../contracts/Microfinance.json';
import trustScoreAbi from '../contracts/TrustScoreRegistry.json';
import { parseBlockchainError, checkIdentityOwnership } from '../blockchainService';
import TransactionAccordion from '../components/TransactionAccordion';

// Helper to convert wagmi client to ethers signer
async function clientToSigner(config, chainId) {
    const client = await getConnectorClient(config, { chainId });
    if (!client) return null;
    const { account, chain, transport } = client;
    const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
    };
    const provider = new ethers.BrowserProvider(transport, network);
    const signer = new ethers.JsonRpcSigner(provider, account.address);
    return signer;
}

const LenderDashboard = () => {
    const { userProfile, token } = useAuth();
    const { address: walletAddress, isConnected, chainId } = useAccount();
    const config = useConfig();
    const navigate = useNavigate();

    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchLoans();
        verifyIdentity();
    }, [walletAddress]);

    const verifyIdentity = async () => {
        if (walletAddress) {
            const hasNFT = await checkIdentityOwnership(walletAddress);
            if (!hasNFT && localStorage.getItem("isOnboarded") === "true") {
                localStorage.removeItem("isOnboarded");
                navigate("/onboarding");
            }
        }
    };

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/loans');
            if (res.data.success) {
                const loanData = res.data.data;
                const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
                const trustRegistry = new ethers.Contract(addresses.trustScore, trustScoreAbi, provider);

                const enhancedLoans = await Promise.all(loanData.map(async (loan) => {
                    try {
                        if (loan.borrower?.walletAddress) {
                            const onChainScore = await trustRegistry.getTrustScore(loan.borrower.walletAddress);
                            return { ...loan, onChainTrustScore: Number(onChainScore) };
                        }
                    } catch (e) {
                        console.warn("Failed to fetch on-chain score", e);
                    }
                    return { ...loan, onChainTrustScore: loan.borrower?.trustScore || 0 };
                }));
                setLoans(enhancedLoans);
            }
        } catch (error) {
            toast.error("Failed to sync marketplace");
        } finally {
            setLoading(false);
        }
    };

    const handleFundLoan = async (loanId, smartContractId, borrowerWallet, amount, interestRate, durationMonths) => {
        if (!isConnected) return toast.error("Please connect wallet");

        const tid = toast.loading('Initiating protocol deployment...');
        setActionLoading(loanId);

        try {
            const hasIdentity = await checkIdentityOwnership(walletAddress);
            if (!hasIdentity) {
                toast.error("No identity NFT detected", { id: tid });
                navigate("/onboarding");
                return;
            }

            const signer = await clientToSigner(config, chainId);
            if (!signer) throw new Error("Failed to get signer");
            const contract = new ethers.Contract(addresses.microfinance, microfinanceAbi, signer);
            const principal = ethers.parseEther(amount.toString());

            toast.loading('Confirm in wallet...', { id: tid });
            let tx;
            if (smartContractId) {
                tx = await contract.fundLoan(smartContractId, { value: principal });
            } else {
                const repaymentAmount = ethers.parseEther(((amount * (100 + interestRate)) / 100).toString());
                const durationInSeconds = durationMonths * 30 * 24 * 60 * 60;
                tx = await contract.createLoan(borrowerWallet, repaymentAmount, durationInSeconds, { value: principal });
            }

            toast.loading('Mining transaction...', { id: tid });
            await tx.wait();

            toast.loading('Synchronizing state...', { id: tid });
            await axios.put(`http://localhost:5000/api/loans/${loanId}/fund`, {
                lenderId: userProfile._id
            }, {
                headers: { Authorization: `Bearer ${token || userProfile.token}` }
            });

            toast.success('Capital deployed successfully!', { id: tid });
            fetchLoans();
        } catch (error) {
            toast.error(parseBlockchainError(error), { id: tid });
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-8 md:space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                        <FiGlobe className="text-blue-500" /> Marketplace
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium italic">Deploy capital into verified, peer-to-peer overcollateralized loans.</p>
                </div>
                <button
                    onClick={fetchLoans}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all bg-slate-900/50 hover:bg-slate-800 border border-slate-800 px-5 py-3 rounded-xl shadow-lg active:scale-95"
                >
                    <FiSearch className={loading ? 'animate-spin' : ''} />
                    Sync Protocol
                </button>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="premium-card animate-pulse h-96 bg-slate-900/20 rounded-3xl border border-slate-900/50"></div>
                    ))}
                </div>
            ) : loans.length === 0 ? (
                <div className="premium-card text-center py-20 space-y-6 border-2 border-dashed border-slate-900">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-700">
                        <FiInfo size={40} />
                    </div>
                    <p className="text-slate-500 font-bold italic text-lg">Market is synchronized. No active requests.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                    {loans.map((loan) => (
                        <div key={loan._id} className="premium-card !p-8 md:!p-10 flex flex-col justify-between border-l-4 border-l-emerald-600/50 hover:border-l-blue-600 transition-all duration-500 hover:shadow-2xl">
                            <div>
                                <div className="flex justify-between items-start mb-8">
                                    <div className="space-y-1">
                                        <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] text-slate-600">Capital Required</p>
                                        <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic">{loan.amountRequested} <span className="text-sm font-normal text-slate-500 not-italic ml-1">MATIC</span></h3>
                                    </div>
                                    <span className="bg-emerald-500/10 text-emerald-500 text-[9px] md:text-[10px] px-3 py-1.5 rounded-lg font-black uppercase tracking-tighter border border-emerald-500/20 shadow-inner">
                                        {loan.interestRate}% APY
                                    </span>
                                </div>

                                <div className="space-y-6 mb-10">
                                    <div className="flex items-center justify-between p-4 bg-fintech-dark rounded-2xl border border-slate-900 shadow-inner">
                                        <div className="flex items-center gap-2">
                                            <FiTrendingUp className="text-blue-500" />
                                            <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Trust Index</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-white font-black italic text-lg">{loan.onChainTrustScore}</span>
                                            <div className="flex gap-1.5">
                                                {loan.onChainTrustScore >= 300 && <span className="bg-blue-500/10 text-blue-500 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest shadow-[0_0_10px_rgba(37,99,235,0.1)]">Elite</span>}
                                                {loan.onChainTrustScore >= 100 && <span className="bg-emerald-500/10 text-emerald-500 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Verified</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-fintech-dark rounded-2xl border border-slate-900 shadow-inner">
                                            <p className="text-[9px] uppercase font-black tracking-widest text-slate-600 mb-2">Interest</p>
                                            <p className="text-emerald-500 font-black italic text-lg">+{(loan.amountRequested * (loan.interestRate / 100)).toFixed(3)}</p>
                                        </div>
                                        <div className="p-4 bg-fintech-dark rounded-2xl border border-slate-900 shadow-inner">
                                            <p className="text-[9px] uppercase font-black tracking-widest text-slate-600 mb-2">Term</p>
                                            <p className="text-white font-black italic text-lg">{loan.durationMonths}m</p>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-800/50">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-700 mb-3 px-1">Borrower Rationale</p>
                                        <p className="text-slate-400 text-xs italic line-clamp-2 leading-relaxed font-medium px-1">"{loan.purpose}"</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-slate-900">
                                <TransactionAccordion txHash={loan.simulatedSmartContractId ? `Protocol ID: ${loan.simulatedSmartContractId}` : null} />
                                <button
                                    onClick={() => handleFundLoan(loan._id, loan.simulatedSmartContractId, loan.borrower?.walletAddress, loan.amountRequested, loan.interestRate, loan.durationMonths)}
                                    disabled={actionLoading === loan._id}
                                    className="btn-primary w-full !py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]"
                                >
                                    {actionLoading === loan._id ? <FiLoader className="animate-spin inline mr-2 text-white" /> : 'Deploy Capital'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LenderDashboard;
