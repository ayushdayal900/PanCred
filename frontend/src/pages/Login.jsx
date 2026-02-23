import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Login = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">

            {/* Hero Section */}
            <div className="text-center max-w-3xl mb-12">
                <div className="inline-flex items-center space-x-2 bg-fintech-accent/10 text-fintech-accent px-4 py-2 rounded-full text-sm font-semibold tracking-wide mb-6 border border-fintech-accent/30">
                    <span className="w-2 h-2 rounded-full bg-fintech-accent animate-pulse"></span>
                    <span>Decentralized Microfinance Protocol</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
                    Borderless Capital,<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        Identity First.
                    </span>
                </h1>

                <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
                    A trustless lending market connecting verified borrowers with global yield-seekers. Join the future of credit using your Web3 identity.
                </p>

                {/* Main Call to Action: The Wallet Connect Button */}
                <div className="flex justify-center transform hover:scale-105 transition-transform">
                    <ConnectButton.Custom>
                        {({
                            account,
                            chain,
                            openAccountModal,
                            openChainModal,
                            openConnectModal,
                            authenticationStatus,
                            mounted,
                        }) => {
                            const ready = mounted && authenticationStatus !== 'loading';
                            const connected =
                                ready &&
                                account &&
                                chain &&
                                (!authenticationStatus ||
                                    authenticationStatus === 'authenticated');

                            return (
                                <div
                                    {...(!ready && {
                                        'aria-hidden': true,
                                        'style': {
                                            opacity: 0,
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                        },
                                    })}
                                >
                                    {(() => {
                                        if (!connected) {
                                            return (
                                                <button onClick={openConnectModal} type="button" className="bg-fintech-accent hover:bg-blue-600 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_40px_-10px_rgba(59,130,246,0.6)] text-lg transition-all border border-blue-400/30">
                                                    Connect Wallet to Login / Sign Up
                                                </button>
                                            );
                                        }
                                        if (chain.unsupported) {
                                            return (
                                                <button onClick={openChainModal} type="button" className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-10 rounded-xl transition-all">
                                                    Wrong network
                                                </button>
                                            );
                                        }
                                        return (
                                            <button onClick={openAccountModal} type="button" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
                                                {account.displayName}
                                            </button>
                                        );
                                    })()}
                                </div>
                            );
                        }}
                    </ConnectButton.Custom>
                </div>
            </div>

            {/* Features / Value Prop Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full mt-8">
                <div className="bg-fintech-card p-8 rounded-2xl border border-fintech-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                        <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        For Borrowers
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Access capital instantly. We use simulated KYC and your decentralized history to issue a Soulbound Trust NFT, skipping the banks.
                    </p>
                </div>

                <div className="bg-fintech-card p-8 rounded-2xl border border-fintech-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                        <svg className="w-5 h-5 text-emerald-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        For Lenders
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Earn secure yield. Deploy funds into AI-vetted, overcollateralized smart contracts with auto-repayment engines active 24/7.
                    </p>
                </div>
            </div>

        </div>
    );
};

export default Login;
