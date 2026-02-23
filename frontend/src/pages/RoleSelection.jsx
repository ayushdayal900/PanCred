import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const RoleSelection = () => {
    const { updateRole } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSelectRole = async (role) => {
        setLoading(true);
        await updateRole(role);
        setLoading(false);
        // After setting role, redirect them to complete KYC
        navigate('/kyc');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to MicroFin</h2>
            <p className="text-slate-400 mb-10 text-center max-w-md">
                Your wallet is connected, but your identity is Unassigned. How would you like to participate in the decentralized economy?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
                {/* Borrower Card */}
                <button
                    onClick={() => handleSelectRole('Borrower')}
                    disabled={loading}
                    className="flex flex-col items-center p-8 bg-fintech-dark border border-fintech-border rounded-xl hover:border-fintech-accent transition-all group text-left"
                >
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Borrower</h3>
                    <p className="text-slate-400 text-sm text-center">
                        Request capital from global lenders based on your on-chain reputation. Quick approvals, low rates.
                    </p>
                </button>

                {/* Lender Card */}
                <button
                    onClick={() => handleSelectRole('Lender')}
                    disabled={loading}
                    className="flex flex-col items-center p-8 bg-fintech-dark border border-fintech-border rounded-xl hover:border-emerald-500 transition-all group text-left"
                >
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Lender</h3>
                    <p className="text-slate-400 text-sm text-center">
                        Deploy your capital into smart contracts to earn secure, decentralized yield while empowering others.
                    </p>
                </button>
            </div>
        </div>
    );
};

export default RoleSelection;
