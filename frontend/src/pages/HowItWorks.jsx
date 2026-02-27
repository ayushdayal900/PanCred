import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    FiShield, FiLayers, FiRefreshCcw, FiStar, FiGlobe,
    FiUser, FiArrowRight, FiCreditCard, FiDollarSign,
    FiLock, FiActivity, FiCheckCircle, FiTrendingUp, FiAward
} from 'react-icons/fi';

const HowItWorks = () => {
    const navigate = useNavigate();

    const steps = [
        {
            icon: <FiUser />,
            step: "01",
            title: "Identity Layer — Sign Up & KYC",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-l-blue-500/40",
            points: [
                "Register with email and password",
                "Submit your 12-digit Aadhaar number for document verification",
                "Pass a biometric liveliness scan (webcam-based)",
                "Connect your Ethereum wallet (MetaMask / WalletConnect)",
                "Mint your Soulbound Identity NFT on Sepolia — non-transferable, permanent",
                "Trust Score initialized at 300 pts, history entry created on-chain"
            ]
        },
        {
            icon: <FiLayers />,
            step: "02",
            title: "Role Assignment",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-l-emerald-500/40",
            points: [
                "Choose your protocol role: Borrower or Lender",
                "Role is stored both in MongoDB and referenced from your wallet",
                "Borrowers access the loan request dashboard",
                "Lenders access the live marketplace and funded agreements tracker",
                "Role-based UI filtering — each dashboard shows only relevant data"
            ]
        },
        {
            icon: <FiCreditCard />,
            step: "03",
            title: "Borrower — Request Capital",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-l-amber-500/40",
            points: [
                "Borrower submits loan request: amount (ETH), interest rate, duration (months), and purpose",
                "Requires Soulbound NFT in wallet — non-verified wallets are rejected",
                "Request is stored in MongoDB and broadcast to the lender marketplace",
                "Borrower can also post directly on-chain via LoanAgreementFactory.createLoanRequest()"
            ]
        },
        {
            icon: <FiDollarSign />,
            step: "04",
            title: "Lender — Deploy Capital",
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "border-l-purple-500/40",
            points: [
                "Lender browses live loan requests on the marketplace — sorted with on-chain trust scores",
                "Lender clicks 'Deploy Capital' and approves in MetaMask",
                "LoanAgreementFactory.fundLoanRequest() deploys a unique LoanAgreement contract",
                "Principal (ETH) is forwarded directly to the borrower's wallet in the same transaction",
                "Lender Trust Score: +50 for first loan funded, +10 for subsequent loans"
            ]
        },
        {
            icon: <FiRefreshCcw />,
            step: "05",
            title: "Monthly Repayments",
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-l-rose-500/40",
            points: [
                "Borrower pays each installment via payInstallment() on their LoanAgreement contract",
                "Each payment is split automatically on-chain:",
                "→ Lender receives: installment - insurance cut",
                "→ Treasury receives: 1% of totalRepayment ÷ durationMonths (dynamic insurance)",
                "Next due timestamp advances by 30 days after each payment",
                "Borrower Trust Score: +100 for first repayment, +75 for subsequent repayments",
                "Loan marked 'Completed' on-chain when all installments are made"
            ]
        },
        {
            icon: <FiStar />,
            step: "06",
            title: "Trust Score & Tier System",
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            border: "border-l-cyan-500/40",
            points: [
                "Score range: 0 – 1000, stored in TrustScoreRegistry smart contract",
                "NFT Minted: +300 pts (base initialization)",
                "First loan funded (lender): +50 pts",
                "Subsequent loans funded: +10 pts each",
                "First successful repayment: +100 pts",
                "Subsequent repayments: +75 pts each",
                "Tiers — Bronze Pilot (0–99), Silver Verified (100–299), Gold Elite (300+)",
                "Every change logged in TrustScoreHistory with before/after values"
            ]
        },
        {
            icon: <FiDollarSign />,
            step: "07",
            title: "Dynamic Insurance Pool",
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-l-orange-500/40",
            points: [
                "Insurance fee = 1% of totalRepayment (INSURANCE_BPS = 100 basis points)",
                "Fee is split across installments: insuranceFeePerInstallment = totalInsurance / duration",
                "On every repayment, the cut goes automatically to the treasury address",
                "No fixed ETH fee — fee scales fairly with the loan size",
                "Example: 0.25 ETH repayment → 0.0025 ETH to insurance pool"
            ]
        },
        {
            icon: <FiGlobe />,
            step: "08",
            title: "Full On-Chain Audit",
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "border-l-indigo-500/40",
            points: [
                "Every mint, fund, and repayment is on Ethereum Sepolia — verifiable forever",
                "SoulboundIdentity contract — NFT ownership verification",
                "TrustScoreRegistry contract — getTrustScore(address) readable by anyone",
                "LoanAgreement contract — getStatus() returns full loan state",
                "Etherscan evidence links shown in the Protocol Profile page",
                "Backend blockchain event poller syncs on-chain state to MongoDB every 15 seconds"
            ]
        }
    ];

    const trustEvents = [
        { event: "NFT Minted", who: "Both", pts: "+300", color: "text-blue-400" },
        { event: "First loan funded", who: "Lender", pts: "+50", color: "text-emerald-400" },
        { event: "Subsequent loans funded", who: "Lender", pts: "+10", color: "text-emerald-400" },
        { event: "First repayment", who: "Borrower", pts: "+100", color: "text-purple-400" },
        { event: "Subsequent repayments", who: "Borrower", pts: "+75", color: "text-purple-400" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-16 pb-20"
        >
            {/* Header */}
            <div className="text-center space-y-4 pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Protocol Documentation</p>
                <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter">How Aamba Works</h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed font-medium">
                    A complete walkthrough of every layer — from identity verification to on-chain repayments and dynamic insurance — built and deployed on Ethereum Sepolia.
                </p>
            </div>

            {/* Step Cards */}
            <div className="space-y-6">
                {steps.map((section, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.07 }}
                        className={`premium-card relative overflow-hidden group border-l-4 ${section.border}`}
                    >
                        <div className="flex items-start gap-6">
                            <div className={`w-12 h-12 flex-shrink-0 ${section.bg} ${section.color} rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                {section.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${section.color}`}>Step {section.step}</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight mb-4">{section.title}</h3>
                                <ul className="space-y-2">
                                    {section.points.map((point, pi) => (
                                        <li key={pi} className={`flex items-start gap-2 text-sm ${point.startsWith('→') ? 'text-slate-300 ml-4' : 'text-slate-400'} font-medium leading-relaxed`}>
                                            {!point.startsWith('→') && <FiCheckCircle className={`${section.color} flex-shrink-0 mt-0.5`} size={12} />}
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Trust Score Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="premium-card"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                        <FiActivity />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">On-chain Registry</p>
                        <h3 className="text-xl font-black text-white italic">Trust Score Events</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-900">
                                <th className="text-left text-[9px] font-black uppercase tracking-widest text-slate-600 pb-3">Event</th>
                                <th className="text-left text-[9px] font-black uppercase tracking-widest text-slate-600 pb-3">Who</th>
                                <th className="text-right text-[9px] font-black uppercase tracking-widest text-slate-600 pb-3">Points</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/50">
                            {trustEvents.map((e, i) => (
                                <tr key={i} className="group hover:bg-slate-900/30 transition-colors">
                                    <td className="py-3 font-medium text-slate-300">{e.event}</td>
                                    <td className="py-3 text-slate-500 font-medium">{e.who}</td>
                                    <td className={`py-3 text-right font-black italic ${e.color}`}>{e.pts}</td>
                                </tr>
                            ))}
                            <tr className="border-t border-slate-800">
                                <td colSpan={3} className="pt-4 text-[10px] text-slate-600 font-black uppercase tracking-widest">Max Score: 1000 pts · Capped per TrustScoreRegistry.sol</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Tier Ladder */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                {[
                    { tier: "Bronze Pilot", range: "0 – 99 pts", color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/20", icon: <FiShield /> },
                    { tier: "Silver Verified", range: "100 – 299 pts", color: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-400/20", icon: <FiAward /> },
                    { tier: "Gold Elite", range: "300+ pts", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", icon: <FiStar /> },
                ].map((t, i) => (
                    <div key={i} className={`premium-card border ${t.border} text-center`}>
                        <div className={`w-12 h-12 ${t.bg} ${t.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl`}>
                            {t.icon}
                        </div>
                        <p className={`text-sm font-black italic ${t.color}`}>{t.tier}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">{t.range}</p>
                    </div>
                ))}
            </motion.div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-blue-600/20 via-slate-900 to-indigo-700/10 border border-blue-600/20 rounded-3xl p-10 text-white text-center shadow-xl">
                <h2 className="text-2xl md:text-3xl font-black italic tracking-tight mb-4">Ready to start your journey?</h2>
                <p className="text-slate-400 mb-8 max-w-xl mx-auto font-medium text-sm leading-relaxed">
                    Join a growing network of verified participants. Mint your identity, build your trust score, and access decentralized capital — fully on-chain.
                </p>
                <button
                    onClick={() => navigate('/signup')}
                    className="btn-primary !py-4 px-10 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black group"
                >
                    Enter Protocol <FiArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                </button>
            </div>
        </motion.div>
    );
};

export default HowItWorks;
