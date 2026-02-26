import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
    FiTrendingUp, FiShield, FiArrowRight, FiLoader,
    FiCheckCircle, FiAlertCircle, FiSend, FiInfo
} from 'react-icons/fi';
import { checkIdentityOwnership, parseBlockchainError } from '../blockchainService';
import addresses from '../contracts/addresses.json';
import _factoryJson from '../contracts/LoanAgreementFactory.json';

const factoryAbi = Array.isArray(_factoryJson) ? _factoryJson : _factoryJson.abi;

// ─── Loan Request Form ──────────────────────────────────────────────────────
const LoanRequestForm = ({ walletAddress, walletClient }) => {
    const [principal, setPrincipal] = useState('');
    const [totalRepayment, setTotalRepayment] = useState('');
    const [duration, setDuration] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const impliedAPR = (() => {
        if (!principal || !totalRepayment || !duration) return null;
        const interest = Number(totalRepayment) - Number(principal);
        if (interest < 0) return null;
        const apr = ((interest / Number(principal)) / Number(duration)) * 12 * 100;
        return apr.toFixed(1);
    })();

    const monthlyPayment = (() => {
        if (!totalRepayment || !duration) return null;
        return (Number(totalRepayment) / Number(duration)).toFixed(6);
    })();

    const hasFactory = !!addresses.loanFactory;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hasFactory) {
            toast.error('Factory contract not yet deployed. Run deployFactory.js first.');
            return;
        }

        const principalEth = Number(principal);
        const repaymentEth = Number(totalRepayment);
        const durationMonths = Number(duration);

        if (repaymentEth < principalEth) {
            toast.error('Total repayment must be ≥ principal');
            return;
        }
        if (durationMonths < 1 || durationMonths > 36) {
            toast.error('Duration must be 1–36 months');
            return;
        }

        const tid = toast.loading('Preparing loan ad...');
        setSubmitting(true);
        try {
            const provider = new ethers.BrowserProvider(walletClient.transport);
            const signer = await provider.getSigner();
            const factory = new ethers.Contract(addresses.loanFactory, factoryAbi, signer);

            const principalWei = ethers.parseEther(principal.toString());
            const repaymentWei = ethers.parseEther(totalRepayment.toString());

            toast.loading('Confirm in wallet...', { id: tid });
            const tx = await factory.createLoanRequest(principalWei, repaymentWei, durationMonths);

            toast.loading('Broadcasting to Sepolia...', { id: tid });
            await tx.wait();

            toast.success('Loan ad posted on-chain! Lenders can now fund it.', { id: tid });
            setSubmitted(true);
            setPrincipal(''); setTotalRepayment(''); setDuration('');
        } catch (err) {
            console.error('[Borrow] createLoanRequest failed:', err);
            toast.error(parseBlockchainError(err), { id: tid });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="premium-card !p-8 md:!p-10 border-l-4 border-l-blue-500/50">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                    <FiSend size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white italic tracking-tight">Post Loan Request</h3>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Published on-chain · Visible to all lenders</p>
                </div>
            </div>

            {!hasFactory && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6">
                    <FiAlertCircle className="text-amber-500 shrink-0" />
                    <p className="text-[11px] text-amber-400 font-bold">
                        Factory not deployed yet. Run: <code className="font-mono bg-slate-900 px-1 rounded">npx hardhat run scripts/deployFactory.js --network sepolia</code>
                    </p>
                </div>
            )}

            {submitted && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6">
                    <FiCheckCircle className="text-emerald-500" />
                    <p className="text-[11px] text-emerald-400 font-bold">
                        Ad posted successfully! Check the Lender marketplace to see it live.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-3 px-1">
                            Principal (ETH) — Amount you need
                        </label>
                        <input
                            type="number"
                            value={principal}
                            onChange={e => setPrincipal(e.target.value)}
                            required min="0.001" step="0.001"
                            placeholder="0.500"
                            className="w-full bg-fintech-dark border border-fintech-border text-white rounded-xl p-4 focus:border-blue-500 focus:outline-none transition-all font-mono text-lg shadow-inner"
                        />
                    </div>

                    <div>
                        <label className="block text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-3 px-1">
                            Total Repayment (ETH) — You pay back
                        </label>
                        <input
                            type="number"
                            value={totalRepayment}
                            onChange={e => setTotalRepayment(e.target.value)}
                            required min="0.001" step="0.001"
                            placeholder="0.600"
                            className="w-full bg-fintech-dark border border-fintech-border text-white rounded-xl p-4 focus:border-blue-500 focus:outline-none transition-all font-mono text-lg shadow-inner"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[9px] uppercase font-black text-slate-600 tracking-[0.2em] mb-3 px-1">
                        Duration (Months) — 1 to 36
                    </label>
                    <input
                        type="number"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        required min="1" max="36" step="1"
                        placeholder="2"
                        className="w-full bg-fintech-dark border border-fintech-border text-white rounded-xl p-4 focus:border-blue-500 focus:outline-none transition-all font-black text-lg shadow-inner"
                    />
                </div>

                {/* Live Preview */}
                {monthlyPayment && impliedAPR && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Monthly</p>
                            <p className="text-white font-black italic text-lg">{monthlyPayment} <span className="text-slate-500 text-xs not-italic">ETH</span></p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Implied APR</p>
                            <p className="text-blue-400 font-black italic text-lg">{impliedAPR}%</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Insurance</p>
                            <p className="text-amber-400 font-black italic text-lg">0.01 <span className="text-slate-500 text-xs not-italic">ETH</span></p>
                        </div>
                    </div>
                )}

                <div className="bg-slate-950/40 border border-slate-900 rounded-xl px-4 py-3 flex items-start gap-3">
                    <FiInfo className="text-slate-500 shrink-0 mt-0.5" size={13} />
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Once a lender funds your request, a smart contract is deployed and principal is transferred to your wallet instantly.
                        A total of <strong className="text-slate-400">0.01 ETH insurance fee</strong> is distributed to the protocol treasury across your installments.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={submitting || !hasFactory}
                    className="btn-primary w-full !py-5 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/10"
                >
                    {submitting
                        ? <><FiLoader className="animate-spin inline mr-2" />Broadcasting Ad...</>
                        : <><FiSend size={14} className="inline mr-2" />Post Loan Request On-Chain</>
                    }
                </button>
            </form>
        </div>
    );
};

// ─── Main Borrow Page ────────────────────────────────────────────────────────
const Borrow = () => {
    const navigate = useNavigate();
    const { address: walletAddress } = useAccount();
    const { data: walletClient } = useWalletClient();

    const [isVerified, setIsVerified] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkNFT = async () => {
            if (!walletAddress) { setChecking(false); return; }
            setChecking(true);
            try {
                const provider = walletClient ? new ethers.BrowserProvider(walletClient.transport) : null;
                const verified = await checkIdentityOwnership(walletAddress, provider);
                setIsVerified(verified);
            } catch (err) {
                console.error('[Borrow] NFT check failed:', err);
                setIsVerified(false);
            } finally {
                setChecking(false);
            }
        };
        checkNFT();
    }, [walletAddress, walletClient]);

    return (
        <div className="space-y-8 md:space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                        <FiTrendingUp className="text-blue-500" /> Borrow Capital
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium italic">Post a loan request — lenders fund directly to your wallet.</p>
                </div>
            </header>

            {/* Checking */}
            {checking && (
                <div className="premium-card !p-12 flex flex-col items-center justify-center gap-4 text-slate-500">
                    <FiLoader size={32} className="animate-spin text-blue-500" />
                    <p className="text-[11px] font-black uppercase tracking-widest">Verifying identity on-chain...</p>
                </div>
            )}

            {/* Not verified */}
            {!checking && !isVerified && (
                <div className="premium-card !p-8 md:!p-12 border-l-4 border-l-blue-600/50">
                    <p className="text-base md:text-xl text-slate-400 mb-10 font-medium leading-relaxed max-w-2xl">
                        Access liquidity instantly using your on-chain protocol reputation score. No centralized credit checks, no hidden fees.
                    </p>

                    <div className="bg-slate-950/50 border-2 border-dashed border-slate-900 p-8 md:p-10 rounded-[2.5rem] mt-8">
                        <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-10">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 shadow-lg">
                                <FiShield size={40} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight">Initialize Credit Profile</h3>
                                <p className="text-slate-500 text-sm md:text-base leading-relaxed font-medium">
                                    Before posting a decentralized loan request, you must verify your identity and mint a non-transferable Soulbound Identity NFT.
                                </p>
                            </div>
                        </div>
                        <div className="mt-10 pt-10 border-t border-slate-900 flex justify-end">
                            <button
                                onClick={() => navigate('/onboarding')}
                                className="btn-primary w-full md:w-auto px-10 !py-4 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/10"
                            >
                                Get Verified &amp; Mint NFT <FiArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Verified — show form */}
            {!checking && isVerified && (
                <div className="space-y-8">
                    <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 px-5 py-3 rounded-2xl w-fit">
                        <FiCheckCircle className="text-emerald-500" size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Identity Verified — Credit Profile Active</span>
                    </div>

                    <LoanRequestForm walletAddress={walletAddress} walletClient={walletClient} />
                </div>
            )}
        </div>
    );
};

export default Borrow;
