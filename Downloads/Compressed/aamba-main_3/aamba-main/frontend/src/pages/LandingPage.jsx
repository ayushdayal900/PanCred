import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    FiArrowRight, FiShield, FiTrendingUp, FiLayers, FiCheckCircle,
    FiLock, FiZap, FiDollarSign, FiAward, FiUsers, FiGlobe,
    FiCreditCard, FiActivity, FiEye
} from 'react-icons/fi';
import { getSBTCount } from '../blockchainService';

const LandingPage = () => {
    const navigate = useNavigate();
    const [sbtCount, setSbtCount] = useState(null);

    useEffect(() => {
        getSBTCount().then((count) => setSbtCount(count));
    }, []);

    const pillars = [
        {
            icon: <FiShield />,
            title: "Soulbound Identity NFT",
            description: "Non-transferable on-chain identity minted after Aadhaar + biometric KYC. Your key to the entire protocol.",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            tag: "ERC-721 Soulbound"
        },
        {
            icon: <FiTrendingUp />,
            title: "Dynamic Trust Score",
            description: "On-chain reputation built from real actions — NFT mint, loan funding, and repayments. Starts at 300, grows to 1000.",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            tag: "0–1000 Scale"
        },
        {
            icon: <FiLayers />,
            title: "P2P Lending Market",
            description: "Borrowers post requests, lenders fund them directly. Capital flows peer-to-peer via immutable smart contracts — no bank.",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            tag: "Permissionless"
        },
        {
            icon: <FiDollarSign />,
            title: "Dynamic Insurance Pool",
            description: "1% of every loan's total repayment is auto-routed to the protocol treasury on each installment. Fair, proportional pricing.",
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            tag: "1% Dynamic Fee"
        },
        {
            icon: <FiCreditCard />,
            title: "Installment Agreements",
            description: "Each funded loan deploys a unique LoanAgreement contract. Borrower repays in monthly installments — lender tracks in real-time.",
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            tag: "Monthly Installments"
        },
        {
            icon: <FiEye />,
            title: "Full On-Chain Audit",
            description: "Every transaction — mint, fund, repay — is permanently recorded on Ethereum Sepolia. Verifiable by anyone, anytime.",
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            tag: "Fully Transparent"
        }
    ];

    const howItWorks = [
        {
            step: "01",
            title: "Sign Up & Verify Identity",
            desc: "Register, complete Aadhaar + biometric KYC, connect your wallet. Your Soulbound Identity NFT is minted — trust score starts at 300.",
            color: "text-blue-500",
            border: "border-blue-500/20"
        },
        {
            step: "02",
            title: "Choose Your Role",
            desc: "Select Borrower or Lender. Borrowers post loan requests with amount, interest rate, and purpose. Lenders browse the live marketplace.",
            color: "text-emerald-500",
            border: "border-emerald-500/20"
        },
        {
            step: "03",
            title: "Fund or Request Capital",
            desc: "Lenders deploy ETH directly to borrowers via a LoanAgreementFactory contract. Principal is forwarded instantly to the borrower's wallet. Lender trust score +50.",
            color: "text-amber-500",
            border: "border-amber-500/20"
        },
        {
            step: "04",
            title: "Repay in Installments",
            desc: "Borrowers repay monthly. Each installment: lender receives principal+interest minus 1% insurance cut. Borrower trust score +100 (first) or +75 (subsequent).",
            color: "text-purple-500",
            border: "border-purple-500/20"
        },
        {
            step: "05",
            title: "Build Reputation On-Chain",
            desc: "Every action is recorded on the TrustScoreRegistry contract. Higher score = better rates, higher loan limits, and Bronze → Silver → Gold tier unlocks.",
            color: "text-rose-500",
            border: "border-rose-500/20"
        }
    ];

    const fullFeatures = [
        { icon: <FiShield />, label: "Soulbound NFT Identity (ERC-721)" },
        { icon: <FiZap />, label: "Biometric + Aadhaar KYC" },
        { icon: <FiTrendingUp />, label: "On-chain Trust Score (0–1000)" },
        { icon: <FiAward />, label: "Bronze / Silver / Gold Tiers" },
        { icon: <FiLayers />, label: "P2P Loan Marketplace" },
        { icon: <FiCreditCard />, label: "Per-Loan Agreement Contracts" },
        { icon: <FiDollarSign />, label: "Dynamic 1% Insurance Pool" },
        { icon: <FiActivity />, label: "Real-time Installment Tracking" },
        { icon: <FiUsers />, label: "Borrower & Lender Dashboards" },
        { icon: <FiGlobe />, label: "Live on Ethereum Sepolia" },
        { icon: <FiLock />, label: "Signer-gated Transactions" },
        { icon: <FiEye />, label: "Full On-Chain Audit Trail" },
    ];

    return (
        <div className="min-h-screen bg-fintech-dark font-sans text-slate-100 overflow-x-hidden">
            <main>
                {/* ── Hero ── */}
                <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 md:px-6">
                    <div className="global-container text-center relative z-10">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-square bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10 opacity-50 md:opacity-100" />

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 md:mb-12">
                                <FiCheckCircle className="text-emerald-500" /> Live on Ethereum Sepolia
                            </div>

                            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black text-white mb-6 md:mb-10 tracking-tighter leading-[1.1] md:leading-[0.9]">
                                Microfinance <br className="hidden sm:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Reimagined.</span>
                            </h1>

                            <p className="text-sm md:text-lg text-slate-400 max-w-2xl mx-auto mb-10 md:mb-16 leading-relaxed font-medium">
                                Peer-to-peer lending powered by decentralized identity, on-chain trust scores, and dynamic insurance — a transparent financial network with no intermediaries.
                            </p>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 md:gap-6 max-w-md mx-auto sm:max-w-none">
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="btn-primary !py-5 px-8 md:px-12 rounded-2xl text-xs md:text-sm uppercase tracking-[0.2em] font-black group w-full sm:w-auto"
                                >
                                    Enter Protocol <FiArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                                </button>
                                <button
                                    onClick={() => navigate('/how-it-works')}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black py-5 px-8 md:px-12 rounded-2xl transition-all border border-slate-800 text-xs md:text-sm uppercase tracking-[0.2em] w-full sm:w-auto shadow-xl"
                                >
                                    How it Works
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ── Proof Bar ── */}
                <section className="py-16 md:py-24 border-y border-fintech-border/30 bg-fintech-surface/30">
                    <div className="global-container grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
                        {[
                            { val: "1%", label: "Dynamic Insurance Fee" },
                            {
                                val: sbtCount === null
                                    ? <span className="animate-pulse text-slate-600">...</span>
                                    : sbtCount === 0 || sbtCount ? sbtCount : "–",
                                label: "SBT Identities Minted"
                            },
                            { val: "0→1000", label: "Trust Score Scale" },
                            { val: "100%", label: "On-Chain Audit" }
                        ].map((s, i) => (
                            <div key={i} className="space-y-1">
                                <div className="text-2xl md:text-4xl font-black text-white leading-none tracking-tighter">{s.val}</div>
                                <div className="text-[8px] md:text-[10px] text-slate-600 font-black uppercase tracking-widest">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── How It Works (inline summary) ── */}
                <section className="py-20 md:py-32 px-4 md:px-6">
                    <div className="global-container">
                        <div className="text-center mb-16 md:mb-24">
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] mb-4">End-to-End Protocol Flow</p>
                            <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter">How Aamba Works</h2>
                        </div>

                        <div className="relative">
                            {/* Vertical connector line */}
                            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-600/40 via-purple-600/20 to-transparent hidden sm:block" />

                            <div className="space-y-8 md:space-y-0">
                                {howItWorks.map((step, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1, duration: 0.5 }}
                                        className={`md:flex md:gap-12 md:items-center ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
                                    >
                                        <div className="md:w-1/2 md:text-right flex-shrink-0 hidden md:block" />
                                        <div className={`premium-card !p-8 md:w-1/2 border-l-4 ${step.border} relative`}>
                                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${step.color} block mb-2`}>Step {step.step}</span>
                                            <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight mb-3">{step.title}</h3>
                                            <p className="text-slate-400 text-sm leading-relaxed font-medium">{step.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Pillars / Core Features ── */}
                <section className="py-20 md:py-32 px-4 md:px-6 bg-fintech-surface/20">
                    <div className="global-container">
                        <div className="text-center mb-16 md:mb-24">
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] mb-4">Protocol Architecture</p>
                            <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter">The Pillars of Aamba</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
                            {pillars.map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.08 }}
                                    viewport={{ once: true }}
                                    className="premium-card text-center group"
                                >
                                    <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto mb-5 ${f.bg} ${f.color} rounded-2xl flex items-center justify-center text-2xl md:text-3xl group-hover:scale-110 transition-transform duration-500 shadow-xl`}>
                                        {f.icon}
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-[0.25em] ${f.color} block mb-3`}>{f.tag}</span>
                                    <h3 className="text-xl md:text-2xl font-black text-white mb-4 italic tracking-tight">{f.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed font-medium">{f.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Full Feature List ── */}
                <section className="py-20 md:py-32 px-4 md:px-6">
                    <div className="global-container">
                        <div className="text-center mb-16">
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] mb-4">Everything Built-In</p>
                            <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter">Complete Feature Set</h2>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {fullFeatures.map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.05 }}
                                    className="premium-card !p-5 flex items-center gap-3 group hover:border-blue-600/30 transition-all"
                                >
                                    <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        {f.icon}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider leading-tight">{f.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="py-20 md:py-32 px-4 md:px-6">
                    <div className="global-container">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="bg-gradient-to-br from-blue-600/20 via-slate-900 to-purple-600/10 border border-blue-600/20 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-blue-600/5 rounded-[3rem] pointer-events-none" />
                            <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter mb-6">Ready to enter the protocol?</h2>
                            <p className="text-slate-400 max-w-xl mx-auto mb-10 font-medium leading-relaxed">
                                Join the network. Mint your identity, build your trust score, and access decentralized capital — all on-chain.
                            </p>
                            <button
                                onClick={() => navigate('/signup')}
                                className="btn-primary !py-5 px-12 rounded-2xl text-xs md:text-sm uppercase tracking-[0.2em] font-black group"
                            >
                                Get Started <FiArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                            </button>
                        </motion.div>
                    </div>
                </section>
            </main>

            <footer className="py-12 md:py-20 px-4 md:px-6 text-center space-y-10 md:space-y-12 border-t border-slate-900/60">
                <div className="global-container">
                    <div className="flex items-center justify-center gap-3 mb-8 md:mb-10">
                        <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center">
                            <FiShield className="text-white text-base" />
                        </div>
                        <span className="text-xl font-black text-white tracking-widest uppercase">AAMBA</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-8 md:mb-10">
                        <a href="#" className="hover:text-blue-500 transition-colors">Whitepaper</a>
                        <a href="#" className="hover:text-blue-500 transition-colors">Protocol Status</a>
                        <a href="#" className="hover:text-blue-500 transition-colors">Privacy</a>
                    </div>
                    <p className="text-slate-700 text-[9px] md:text-[10px] font-medium uppercase tracking-[0.2em] max-w-xs mx-auto md:max-w-none">© 2026 Aamba Finance. Build with conviction.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
