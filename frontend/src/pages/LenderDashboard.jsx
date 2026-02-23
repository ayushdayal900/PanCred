import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const LenderDashboard = () => {
    const { userProfile } = useAuth();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchLoans();
    }, []);

    const fetchLoans = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/loans');
            if (res.data.success) {
                setLoans(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching loans:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFundLoan = async (loanId) => {
        setActionLoading(loanId);
        setMessage('');
        try {
            const res = await axios.put(`http://localhost:5000/api/loans/${loanId}/fund`, {
                lenderId: userProfile._id
            });
            if (res.data.success) {
                setMessage(res.data.message); // Displays smart contract simulation text
                fetchLoans(); // Refresh list to remove funded loan
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error funding loan.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Lender Dashboard</h1>
            <p className="text-slate-400 mb-8">Deploy your capital to secure, overcollateralized Web3 loan requests.</p>

            {message && (
                <div className={`p-4 rounded-lg mb-8 text-sm max-w-3xl ${message.includes('Smart Contract') ? 'bg-fintech-success/20 text-fintech-success border border-fintech-success/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                    {message}
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Live Market Opportunities</h2>
                <button onClick={fetchLoans} className="text-fintech-accent text-sm hover:underline">
                    🔄 Refresh Market
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400">Loading loan requests...</div>
            ) : loans.length === 0 ? (
                <div className="bg-fintech-dark border border-fintech-border rounded-xl p-10 text-center text-slate-400">
                    No pending loan requests in the market right now. Check back later!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loans.map((loan) => (
                        <div key={loan._id} className="bg-fintech-card p-6 rounded-xl border border-fintech-border shadow-lg flex flex-col justify-between hover:border-fintech-accent transition-colors">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Amount Requested</p>
                                        <h3 className="text-2xl font-bold text-emerald-400">{loan.amountRequested} USDC</h3>
                                    </div>
                                    <div className="bg-fintech-dark px-3 py-1 rounded-full border border-fintech-border">
                                        <span className="text-white font-semibold text-sm">{loan.interestRate}% APY</span>
                                    </div>
                                </div>

                                <p className="text-white text-sm font-medium mb-1">Purpose:</p>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{loan.purpose}</p>

                                <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-fintech-border border-dashed">
                                    <div>
                                        <p className="text-slate-500 text-xs">Duration</p>
                                        <p className="text-white text-sm font-medium">{loan.durationMonths} Months</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Borrower Trust Score</p>
                                        <p className="text-emerald-400 text-sm font-bold flex items-center gap-1">
                                            {loan.borrower.trustScore}
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleFundLoan(loan._id)}
                                disabled={actionLoading === loan._id}
                                className="w-full bg-fintech-accent/20 hover:bg-fintech-accent text-fintech-accent hover:text-white font-medium py-3 rounded-lg transition-colors border border-fintech-accent/50"
                            >
                                {actionLoading === loan._id ? 'Deploying Smart Contract...' : 'Accept & Fund Protocol'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LenderDashboard;
