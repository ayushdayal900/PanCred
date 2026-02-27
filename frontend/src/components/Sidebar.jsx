import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FiHome,
    FiTrendingUp,
    FiDownload,
    FiUser,
    FiLogOut,
    FiHelpCircle,
    FiShield,
    FiX
} from 'react-icons/fi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Sidebar = ({ onClose }) => {
    const { logout, userProfile } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
        if (onClose) onClose();
    };

    const handleLinkClick = () => {
        if (onClose) onClose();
    };

    return (
        <aside className="w-[280px] lg:w-64 bg-fintech-surface border-r border-fintech-border h-full flex flex-col pt-8 pb-6 px-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-10 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <FiShield className="text-white text-xl" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white leading-none">AAMBA</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Microfinance</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white"
                    >
                        <FiX size={20} />
                    </button>
                )}
            </div>

            <nav className="flex-1 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-4 mb-4">Protocol Menu</p>

                <NavLink to="/dashboard" onClick={handleLinkClick} end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <FiHome /> Dashboard
                </NavLink>

                {userProfile?.role === 'Lender' && (
                    <NavLink to="/lend" onClick={handleLinkClick} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <FiTrendingUp /> Lend Capital
                    </NavLink>
                )}

                {userProfile?.role === 'Borrower' && (
                    <NavLink to="/borrow" onClick={handleLinkClick} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <FiDownload /> Borrow Assets
                    </NavLink>
                )}

                <NavLink to="/dashboard/profile" onClick={handleLinkClick} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                    <FiUser /> Protocol Profile
                </NavLink>

                <div className="pt-8">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-4 mb-4">Support</p>
                    <NavLink to="/how-it-works" onClick={handleLinkClick} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                        <FiHelpCircle /> How it Works
                    </NavLink>
                </div>
            </nav>

            <div className="mt-8 pt-8 border-t border-fintech-border space-y-6">
                <div className="px-2 overflow-hidden flex justify-center">
                    <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all duration-200 text-sm font-bold"
                >
                    <FiLogOut /> Sign Out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
