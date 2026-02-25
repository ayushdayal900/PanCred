import React from 'react';
import { FiDollarSign, FiZap, FiLock } from 'react-icons/fi';

const Lend = () => {
    return (
        <div className="space-y-8 md:space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                        <FiDollarSign className="text-emerald-500" /> Lending Pools
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium italic">High-yield capital deployment opportunities.</p>
                </div>
            </header>

            <div className="premium-card !p-8 md:!p-12 border-l-4 border-l-emerald-500/50">
                <p className="text-base md:text-xl text-slate-400 mb-10 md:mb-12 font-medium leading-relaxed max-w-2xl">
                    Deposit your digital assets into secure, protocol-verified lending pools to earn yield while empowering borrowers around the globe.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mt-8">
                    {/* Placeholder Pool */}
                    <div className="premium-card !p-8 bg-slate-900/40 border border-slate-800 hover:border-emerald-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight">USDC Stable Pool</h3>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-600">Verified Stablecoin</p>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest border border-emerald-500/20 shadow-lg">
                                8.5% APY
                            </span>
                        </div>
                        <p className="text-slate-500 text-xs md:text-sm mb-8 leading-relaxed font-medium">Low risk, stable yield pool backed by overcollateralized protocol-verified loans.</p>
                        <button disabled className="btn-primary w-full !py-4 text-[10px] font-black uppercase tracking-widest opacity-40 cursor-not-allowed group-hover:opacity-60 transition-all flex items-center justify-center gap-2">
                            <FiLock size={14} /> Synchronizing Pool...
                        </button>
                    </div>

                    {/* Placeholder Pool 2 */}
                    <div className="premium-card !p-8 bg-slate-900/40 border border-slate-800 hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1">
                                <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight">ETH Growth Pool</h3>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-600">Liquid Ethereum</p>
                            </div>
                            <span className="bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest border border-blue-500/20 shadow-lg">
                                12.0% APY
                            </span>
                        </div>
                        <p className="text-slate-500 text-xs md:text-sm mb-8 leading-relaxed font-medium">Medium risk, higher yield pool. Earn native protocol rewards while securing the network.</p>
                        <button disabled className="btn-primary w-full !py-4 text-[10px] font-black uppercase tracking-widest opacity-40 cursor-not-allowed group-hover:opacity-60 transition-all flex items-center justify-center gap-2">
                            <FiLock size={14} /> Synchronizing Pool...
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Lend;
