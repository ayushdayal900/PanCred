import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <nav className="bg-fintech-dark border-b border-fintech-border px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-fintech-accent flex items-center justify-center">
                    <span className="text-white font-bold italic">M</span>
                </div>
                <Link to="/" className="text-xl font-bold text-white tracking-wide">
                    MicroFin
                </Link>
            </div>

            <div className="flex space-x-6 items-center">
                <Link to="/dashboard" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Dashboard</Link>
                <Link to="/lend" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Lend</Link>
                <Link to="/borrow" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Borrow</Link>

                <button className="bg-fintech-accent hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors ml-4 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    Connect Identity
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
