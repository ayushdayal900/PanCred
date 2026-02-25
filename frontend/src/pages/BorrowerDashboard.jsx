import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { ethers } from 'ethers';
import { useAccount, useConfig } from 'wagmi';
import { getConnectorClient } from '@wagmi/core';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiLoader, FiCheckCircle, FiInfo, FiActivity, FiShield, FiPlus } from 'react-icons/fi';

import addresses from '../contracts/addresses.json';
import microfinanceAbi from '../contracts/Microfinance.json';
import { mintIdentity, checkIdentityOwnership, parseBlockchainError } from '../blockchainService';
import LoanTimeline from '../components/LoanTimeline';
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

const BorrowerDashboard = () => {
    const { userProfile, token } = useAuth();
    const { address: walletAddress, isConnected, chainId } = useAccount();
    const config = useConfig();
    const navigate = useNavigate();

    const [amount, setAmount] = useState('');
    const [duration, setDuration] = useState('');
    const [purpose, setPurpose] = useState('');
    const [loading, setLoading] = useState(false);
    const [myLoans, setMyLoans] = useState([]);
    const [processingLoan, setProcessingLoan] = useState(null);

    useEffect(() => {
        if (token || userProfile?.token || walletAddress) {
            fetchMyLoans();
        }
    }, [token, userProfile, walletAddress]);

    const fetchMyLoans = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/loans/my', {
                headers: { Authorization: `Bearer ${token || userProfile.token}` }
            });
            if (res.data.success) {
                setMyLoans(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching my loans:", error);
        }
    };

    const handleRepayLoan = async (loanId, smartContractId, amount) => {
        if (!isConnected) return toast.error("Please connect your wallet");

        const tid = toast.loading('Initiating repayment on-chain...');
        setProcessingLoan(loanId);

        try {
            const hasIdentity = await checkIdentityOwnership(walletAddress);
            if (!hasIdentity) {
                toast.error("Protocol Access Denied: No Identity NFT", { id: tid });
                navigate("/onboarding");
                return;
            }

            const signer = await clientToSigner(config, chainId);
            if (!signer) throw new Error("Failed to get signer");
            const contract = new ethers.Contract(addresses.microfinance, microfinanceAbi, signer);

            const loanDetails = await contract.getLoanDetails(smartContractId);
            const valueToSend = loanDetails.repaymentAmount;

            toast.loading('Confirm repayment in wallet...', { id: tid });
            const tx = await contract.repayLoan(smartContractId, { value: valueToSend });

            toast.loading('Repayment pending on-chain...', { id: tid });
            await tx.wait();

            toast.loading('Finalizing with protocol...', { id: tid });
            await axios.put(`http://localhost:5000/api/loans/${loanId}/repay`, {
                txHash: tx.hash
            }, {
                headers: { Authorization: `Bearer ${token || userProfile.token}` }
            });

            toast.success('Loan fully repaid! Reputation increased.', { id: tid });
            fetchMyLoans();
        } catch (error) {
            toast.error(parseBlockchainError(error), { id: tid });
        } finally {
            setProcessingLoan(null);
        }
    };

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        if (!isConnected) return toast.error("Please connect your wallet");

        const tid = toast.loading('Initializing proposal...');
        setLoading(true);

        try {
            const hasIdentity = await checkIdentityOwnership(walletAddress);
            if (!hasIdentity) {
                toast.error("No identity NFT detected", { id: tid });
                navigate("/onboarding");
                return;
            }

            const signer = await clientToSigner(config, chainId);
            if (!signer) throw new Error("Failed to get signer");

            // Verify Microfinance contract code exists
            const code = await signer.provider.getCode(addresses.microfinance);
            if (code === "0x" || code === "0x0") {
                throw new Error("Loan Contract (Microfinance) not found at configured address on Sepolia.");
            }

            const contract = new ethers.Contract(addresses.microfinance, microfinanceAbi, signer);

            const principal = ethers.parseEther(amount.toString());
            const repayment = ethers.parseEther(((amount * (100 + 10)) / 100).toString());
            const durationInSeconds = Number(duration) * 30 * 24 * 60 * 60;

            toast.loading('Confirm transaction in wallet...', { id: tid });
            const tx = await contract.requestLoan(principal, repayment, durationInSeconds);

            toast.loading('Broadcasting to network...', { id: tid });
            await tx.wait();

            toast.loading('Syncing proposal state...', { id: tid });
            await axios.post('http://localhost:5000/api/loans', {
                borrowerId: userProfile._id,
                amountRequested: Number(amount),
                interestRate: 10,
                durationMonths: Number(duration),
                purpose,
                txHash: tx.hash
            }, {
                headers: { Authorization: `Bearer ${token || userProfile.token}` }
            });

            toast.success('Proposal live in marketplace!', { id: tid });
            setAmount('');
            setDuration('');
            setPurpose('');
            fetchMyLoans();
        } catch (error) {
            toast.error(parseBlockchainError(error), { id: tid });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 md:space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">Borrower Terminal</h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium">Manage your active obligations and protocol reputation.</p>
                </div>
                <div className="flex items-center gap-3 bg-blue-600/5 border border-blue-500/10 px-4 py-2 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Node Sync Active</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                {/* Left Column: Metrics & Form */}
                <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                        <div className="premium-card !p-8">
                            <div className="flex items-center gap-3 text-slate-500 mb-6">
                                <FiActivity className="text-blue-500" />
                                <span className="text-[9px] uppercase font-black tracking-widest">Protocol Reputation</span>
                            </div>
                            <div className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tighter italic">{userProfile?.trustScore || 0}</div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Calculated On-Chain</p>
                        </div>

                        <div className="premium-card !p-8 border-l-4 border-l-emerald-500/50">
                            <div className="flex items-center gap-3 text-emerald-500 mb-6 font-black uppercase tracking-widest text-[9px]">
                                <FiShield /> Identity Status
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-500/5 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                                    <FiCheckCircle size={24} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-white font-black italic tracking-tight text-lg">Verified SBT</p>
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest truncate">Authorized Node</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card !p-8 md:!p-10">
                        <h3 className="text-xl md:text-2xl font-black text-white mb-8 tracking-tight italic flex items-center gap-3">
                            <FiPlus className="text-blue-500" /> Request Capital
                        </h3>
                        <form onSubmit={handleSubmitRequest} className="space-y-6">
                            <div>
                                <label className="block text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-3 px-1">Principal (MATIC)</label>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0.01" step="0.01" placeholder="0.00" className="w-full bg-fintech-dark border border-fintech-border text-white rounded-xl p-4 md:p-5 focus:border-blue-500 focus:outline-none transition-all font-mono text-lg shadow-inner" />
                            </div>
                            <div>
                                <label className="block text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-3 px-1">Term (Months)</label>
                                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} required min="1" placeholder="12" className="w-full bg-fintech-dark border border-fintech-border text-white rounded-xl p-4 md:p-5 focus:border-blue-500 focus:outline-none transition-all font-black shadow-inner" />
                            </div>
                            <div>
                                <label className="block text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-3 px-1">Proposal Purpose</label>
                                <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Describe your plan..." required className="w-full bg-fintech-dark border border-fintech-border text-white rounded-xl p-4 md:p-5 h-28 md:h-32 focus:border-blue-500 focus:outline-none transition-all resize-none shadow-inner text-sm font-medium"></textarea>
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary w-full !py-5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                                {loading ? <FiLoader className="animate-spin inline" /> : 'Broadcast Proposal'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Loan List */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8 order-1 lg:order-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter">Active Obligations</h2>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full font-black uppercase tracking-widest w-fit">{myLoans.length} Records</span>
                    </div>

                    {myLoans.length === 0 ? (
                        <div className="premium-card py-20 text-center space-y-6 border-2 border-dashed border-slate-900">
                            <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto text-slate-700">
                                <FiInfo size={40} />
                            </div>
                            <p className="text-slate-500 font-bold italic text-lg">No active protocol history detected.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 md:space-y-8">
                            {myLoans.map(loan => (
                                <div key={loan._id} className="premium-card !p-8 md:!p-10 border-l-4 border-l-blue-600 group hover:shadow-2xl transition-all duration-500">
                                    <div className="flex flex-col sm:flex-row justify-between gap-8 mb-10">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[9px] md:text-[10px] font-mono text-slate-500 font-black uppercase tracking-widest">Proposal #{loan.simulatedSmartContractId || 'PENDING'}</span>
                                                <span className={`px-2 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-tighter ${loan.status === 'Funded' ? 'bg-blue-500/10 text-blue-500' :
                                                    loan.status === 'Repaid' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        'bg-slate-800 text-slate-500'
                                                    }`}>
                                                    {loan.status}
                                                </span>
                                            </div>
                                            <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic">{loan.amountRequested} <span className="text-slate-500 text-sm font-normal not-italic ml-1">MATIC</span></h3>
                                        </div>

                                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-8 md:gap-12">
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Interest</p>
                                                <p className="text-white font-black italic text-lg">{loan.interestRate}%</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Term</p>
                                                <p className="text-white font-black italic text-lg">{loan.durationMonths}m</p>
                                            </div>
                                            <div className="col-span-2 sm:col-auto border-t sm:border-t-0 sm:border-l border-slate-900 pt-6 sm:pt-0 sm:pl-10 space-y-1">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Total Settle</p>
                                                <p className="text-blue-500 font-black italic text-xl">{(loan.amountRequested * (1 + loan.interestRate / 100)).toFixed(4)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-10 px-2 overflow-x-auto no-scrollbar">
                                        <div className="min-w-[400px]">
                                            <LoanTimeline status={loan.status} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-8 pt-8 border-t border-slate-900">
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4">Blockchain Evidence</p>
                                            <TransactionAccordion txHash={loan.status === 'Funded' ? loan.fundingTxHash : loan.repaymentTxHash} />
                                        </div>

                                        {loan.status === 'Funded' && (
                                            <button
                                                onClick={() => handleRepayLoan(loan._id, loan.simulatedSmartContractId, loan.amountRequested)}
                                                disabled={processingLoan === loan._id}
                                                className="btn-primary w-full md:w-auto px-12 !py-4 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10"
                                            >
                                                {processingLoan === loan._id ? <FiLoader className="animate-spin text-white" /> : 'Settle On-Chain'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BorrowerDashboard;
