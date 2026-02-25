import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiShield, FiTrendingUp, FiLayers, FiUsers } from 'react-icons/fi';

const LandingPage = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <FiShield className="text-fintech-accent" size={32} />,
            title: "Identity NFT",
            description: "Secure your financial identity with a non-transferable Soulbound NFT on the Polygon network."
        },
        {
            icon: <FiTrendingUp className="text-fintech-success" size={32} />,
            title: "Smart Lending",
            description: "Access uncollateralized loans powered by transparent smart contracts and automated risk assessment."
        },
        {
            icon: <FiLayers className="text-fintech-warning" size={32} />,
            title: "Trust Score",
            description: "Build your on-chain credit history. Every successful repayment increases your protocol trust score."
        }
    ];

    return (
        <div className="min-h-screen bg-fintech-dark text-slate-200 overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fintech-accent/5 rounded-full blur-[120px] -mr-64 -mt-64"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -ml-64 -mb-64"></div>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="inline-flex items-center space-x-2 bg-fintech-accent/10 text-fintech-accent px-4 py-2 rounded-full text-sm font-semibold tracking-wide mb-8 border border-fintech-accent/20">
                        <span className="w-2 h-2 rounded-full bg-fintech-accent animate-pulse"></span>
                        <span>v1.0 Live on Ethereum Sepolia</span>
                    </div>
                    <h1 className="text-6xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight">
                        Empowering Financial Inclusion <br />
                        with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-fintech-accent">Decentralized Trust</span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
                        Aamba is a decentralized microfinance protocol that leverages Soulbound NFTs and AI-driven trust scores
                        to provide uncollateralized loans to the underserved.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full sm:w-auto bg-fintech-accent hover:bg-blue-600 text-white font-bold py-5 px-12 rounded-2xl transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 group text-lg"
                        >
                            Get Started <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => navigate('/signin')}
                            className="w-full sm:w-auto bg-fintech-card border border-fintech-border hover:border-slate-500 text-white font-bold py-5 px-12 rounded-2xl transition-all shadow-xl text-lg"
                        >
                            Launch App (Sign In)
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* Features (How it Works) */}
            <section className="relative py-24 px-6 max-w-7xl mx-auto border-t border-fintech-border/30">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-white mb-4">How Aamba Works</h2>
                    <p className="text-slate-500 font-medium uppercase tracking-[0.2em] text-xs">A Three-Pillar Protocol for the Future of Finance</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            viewport={{ once: true }}
                            className="p-8 bg-fintech-card/50 border border-fintech-border rounded-3xl hover:border-fintech-accent/50 transition-all group"
                        >
                            <div className="mb-6 p-4 bg-fintech-dark rounded-2xl w-fit group-hover:scale-110 transition-transform">
                                {f.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">{f.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{f.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Social Proof / Stats */}
            <section className="py-20 bg-fintech-card/30 backdrop-blur-sm border-y border-fintech-border/30">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div className="text-4xl font-black text-white mb-2">$0.00</div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Value Locked</div>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-fintech-accent mb-2">0</div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Identities Minted</div>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-white mb-2">Polygon</div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Scalable Network</div>
                    </div>
                    <div>
                        <div className="text-4xl font-black text-fintech-success mb-2">100%</div>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Transparent</div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 max-w-7xl mx-auto border-t border-fintech-border/30 flex flex-col md:row justify-between items-center gap-6">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-fintech-accent rounded-lg flex items-center justify-center font-bold text-white">A</div>
                    <span className="text-xl font-bold text-white tracking-tight">Aamba Protocol</span>
                </div>
                <div className="flex space-x-8 text-slate-500 text-sm font-medium">
                    <a href="#" className="hover:text-fintech-accent transition-colors">Documentation</a>
                    <a href="#" className="hover:text-fintech-accent transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-fintech-accent transition-colors">Terms of Service</a>
                </div>
                <p className="text-slate-600 text-xs">© 2026 Aamba Finance. Built for the Hackathon.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
