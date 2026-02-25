import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiShield, FiTrendingUp, FiLayers, FiCheckCircle, FiMenu } from 'react-icons/fi';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <FiShield />,
            title: "Soulbound Identity",
            description: "Secure your financial footprint with a non-transferable NFT identity, verified by protocol authorities.",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            icon: <FiTrendingUp />,
            title: "Algorithmic Trust",
            description: "Build an on-chain credit history. Every transaction improves your trust score and lowers your cost of capital.",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            icon: <FiLayers />,
            title: "Peer-to-Peer Market",
            description: "Deploy capital directly to verified borrowers via immutable smart contracts. Transparent, fair, and efficient.",
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        }
    ];

    return (
        <div className="min-h-screen bg-fintech-dark font-sans text-slate-100 overflow-x-hidden">
            <main>
                {/* Hero */}
                <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 md:px-6">
                    <div className="global-container text-center relative z-10">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-square bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10 opacity-50 md:opacity-100"></div>

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
                                Aamba leverages decentralized identity and peer-to-peer lending logic to build the world's first transparent, trust-based financial network. No intermediaries. Just code.
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

                {/* Features */}
                <section className="py-20 md:py-32 px-4 md:px-6">
                    <div className="global-container">
                        <div className="text-center mb-16 md:mb-24">
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">The Pillars of Aamba</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[9px] md:text-[10px]">Financial Stability, Decentralized.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
                            {features.map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                    className="premium-card text-center group"
                                >
                                    <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto mb-6 md:mb-8 ${f.bg} ${f.color} rounded-2xl flex items-center justify-center text-2xl md:text-3xl group-hover:scale-110 transition-transform duration-500 shadow-xl`}>
                                        {f.icon}
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black text-white mb-4 italic tracking-tight">{f.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed font-medium">{f.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Proof */}
                <section className="py-16 md:py-24 border-y border-fintech-border/30 bg-fintech-surface/30">
                    <div className="global-container grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
                        {[
                            { val: "$0.00", label: "Protocol TVL" },
                            { val: "0", label: "SBT Identities" },
                            { val: "Ethereum", label: "Source Chain" },
                            { val: "100%", label: "On-Chain Audit" }
                        ].map((s, i) => (
                            <div key={i} className="space-y-1">
                                <div className="text-2xl md:text-4xl font-black text-white leading-none tracking-tighter">{s.val}</div>
                                <div className="text-[8px] md:text-[10px] text-slate-600 font-black uppercase tracking-widest">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="py-12 md:py-20 px-4 md:px-6 text-center space-y-10 md:space-y-12">
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
