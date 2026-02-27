import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BorrowerDashboard from './BorrowerDashboard';
import LenderDashboard from './LenderDashboard';
import { FiLoader, FiTrendingUp, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';

// ---------- Role Selector ----------
const RoleSelector = ({ onSelect }) => {
    const [selecting, setSelecting] = useState(null);

    const handleSelect = async (role) => {
        setSelecting(role);
        await onSelect(role);
        setSelecting(null);
    };

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-10 py-16">
            <div className="text-center space-y-3 max-w-xl">
                <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 mx-auto mb-6">
                    <FiUser size={32} />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">
                    Select Your Protocol Role
                </h1>
                <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
                    Choose how you want to participate in the AAMBA microfinance protocol. This sets up your dashboard.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                {/* Borrower */}
                <button
                    onClick={() => handleSelect('Borrower')}
                    disabled={!!selecting}
                    className="premium-card !p-8 text-left border-2 border-slate-800 hover:border-blue-500/50 transition-all duration-300 group disabled:opacity-60"
                >
                    <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                        <FiTrendingUp size={28} />
                    </div>
                    <h3 className="text-xl font-black text-white italic tracking-tight mb-2">Borrower</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        Request capital from lenders using your on-chain identity and reputation score.
                    </p>
                    {selecting === 'Borrower' && (
                        <div className="mt-4 flex items-center gap-2 text-blue-500">
                            <FiLoader className="animate-spin" size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Activating...</span>
                        </div>
                    )}
                </button>

                {/* Lender */}
                <button
                    onClick={() => handleSelect('Lender')}
                    disabled={!!selecting}
                    className="premium-card !p-8 text-left border-2 border-slate-800 hover:border-emerald-500/50 transition-all duration-300 group disabled:opacity-60"
                >
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                        <FiTrendingUp size={28} />
                    </div>
                    <h3 className="text-xl font-black text-white italic tracking-tight mb-2">Lender</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        Deploy capital into verified peer-to-peer loans and earn protocol returns.
                    </p>
                    {selecting === 'Lender' && (
                        <div className="mt-4 flex items-center gap-2 text-emerald-500">
                            <FiLoader className="animate-spin" size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Activating...</span>
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
};

// ---------- Main Dashboard ----------
const Dashboard = () => {
    const { userProfile, updateRole } = useAuth();

    const handleRoleSelect = async (role) => {
        try {
            await updateRole(role);
            toast.success(`Role set to ${role}. Welcome!`);
        } catch (err) {
            console.error('[Dashboard] Role update failed:', err);
            toast.error('Failed to set role. Please try again.');
        }
    };

    // Auth context still loading
    if (!userProfile) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-widest animate-pulse">Loading Profile...</span>
            </div>
        );
    }

    // Role properly set
    if (userProfile.role === 'Lender') return <LenderDashboard />;
    if (userProfile.role === 'Borrower') return <BorrowerDashboard />;

    // Role is 'Unassigned' or missing — show role picker
    return <RoleSelector onSelect={handleRoleSelect} />;
};

export default Dashboard;
