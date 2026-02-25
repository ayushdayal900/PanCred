import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiShield, FiArrowRight } from 'react-icons/fi';

const Borrow = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8 md:space-y-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                        <FiTrendingUp className="text-blue-500" /> Borrow Capital
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 font-medium italic">Instant liquidity backed by protocol reputation.</p>
                </div>
            </header>

            <div className="premium-card !p-8 md:!p-12 border-l-4 border-l-blue-600/50">
                <p className="text-base md:text-xl text-slate-400 mb-10 md:mb-12 font-medium leading-relaxed max-w-2xl">
                    Access liquidity instantly using your on-chain protocol reputation score. No centralized credit checks, no hidden fees.
                </p>

                <div className="bg-slate-950/50 border-2 border-dashed border-slate-900 !p-8 md:!p-10 rounded-[2.5rem] mt-10">
                    <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-10">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 shadow-lg">
                            <FiShield size={40} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tight">Initialize Credit Profile</h3>
                            <p className="text-slate-500 text-sm md:text-base leading-relaxed font-medium">
                                Before applying for a decentralized loan, you must verify your identity and generate a non-transferable Identity NFT representing your trust score.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 pt-10 border-t border-slate-900 flex justify-end">
                        <button
                            onClick={() => navigate('/onboarding')}
                            className="btn-primary w-full md:w-auto px-10 !py-4 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/10"
                        >
                            Get Verified & Mint NFT <FiArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Borrow;
