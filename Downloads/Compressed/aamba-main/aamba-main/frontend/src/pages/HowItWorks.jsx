import React from 'react';
import { motion } from 'framer-motion';
import {
    FiShield,
    FiLayers,
    FiRefreshCcw,
    FiStar,
    FiGlobe
} from 'react-icons/fi';
import Layout from '../components/Layout';

const HowItWorks = () => {
    const sections = [
        {
            icon: <FiShield />,
            title: "1. Identity Layer",
            description: "Everything starts with your Soulbound Identity. We use AI-powered liveness checks and document verification to issue a non-transferable NFT. This NFT is your key to the protocol, ensuring every participant is a genuine, verified individual.",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            icon: <FiLayers />,
            title: "2. Lending Logic",
            description: "Lending is governed by immutable Smart Contracts. When a borrower requests capital, it enters a transparent marketplace. Lenders fund requests directly from their wallets, with capital moved instantly to the borrower without any middlemen.",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            icon: <FiRefreshCcw />,
            title: "3. Repayment Enforcement",
            description: "Repayments are streamlined and secure. Borrowers return capital plus a transparent interest rate. The smart contract automatically routes these funds back to the lender's wallet, closing the loan cycle without requiring manual intervention.",
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            icon: <FiStar />,
            title: "4. Trust Score System",
            description: "Consistency is rewarded. Every successful repayment triggers an on-chain Trust Score increment. As your score grows, you unlock higher loan limits and better rates. Your reputation is literally minted on the blockchain.",
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            icon: <FiGlobe />,
            title: "5. Decentralized Impact",
            description: "By removing traditional bank overhead and using blockchain as the source of truth, we lower the cost of capital and increase accessibility. This is microfinance reimaged for the Web3 era.",
            color: "text-rose-500",
            bg: "bg-rose-500/10"
        }
    ];

    return (
        <Layout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12 pb-20"
            >
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black text-white">How Aamba Works</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        We leverage cutting-edge blockchain technology and AI identity verification to build a peer-to-peer lending protocol that is secure, fair, and transparent.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                    {sections.map((section, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="premium-card relative overflow-hidden group"
                        >
                            <div className={`w-14 h-14 ${section.bg} ${section.color} rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-sm`}>
                                {section.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">{section.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                {section.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 text-white text-center shadow-xl shadow-blue-500/20">
                    <h2 className="text-2xl font-black mb-4">Ready to start your journey?</h2>
                    <p className="text-blue-100 mb-8 max-w-xl mx-auto opacity-90">
                        Join thousands of participants building a new era of decentralized finance on the Aamba protocol.
                    </p>
                    <button className="bg-white text-blue-600 font-black px-8 py-3 rounded-xl hover:bg-slate-50 transition-colors uppercase tracking-widest text-xs">
                        Back to Dashboard
                    </button>
                </div>
            </motion.div>
        </Layout>
    );
};

export default HowItWorks;
