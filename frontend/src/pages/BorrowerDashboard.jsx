import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const BorrowerDashboard = () => {
    const { userProfile } = useAuth();
    const [amount, setAmount] = amountState('');
    const [duration, setDuration] = useState('');
    const [purpose, setPurpose] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await axios.post('http://localhost:5000/api/loans', {
                borrowerId: userProfile._id,
                amountRequested: Number(amount),
                interestRate: 8.5, // Fixed rate for now, can be algorithmic later
                durationMonths: Number(duration),
                purpose
            });
            if (res.data.success) {
                setMessage('Loan Request successfully published to the market!');
                setAmount('');
                setDuration('');
                setPurpose('');
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error creating loan request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Borrower Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Profile Stats Sidebar */}
                <div className="col-span-1 space-y-6">
                    <div className="bg-fintech-card p-6 rounded-xl border border-fintech-border shadow-lg">
                        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">My Trust Score</h3>
                        <div className="text-4xl font-bold text-emerald-400 mb-1">{userProfile?.trustScore || 0}</div>
                        <p className="text-sm text-slate-500">Tier: <span className="text-slate-300">Standard</span></p>
                    </div>

                    <div className="bg-fintech-card p-6 rounded-xl border border-fintech-border shadow-lg">
                        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">NFT Identity</h3>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-md shadow-inner flex items-center justify-center">
                                <span className="text-white text-xs font-bold">NFT</span>
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">Soulbound Token</p>
                                <p className="text-slate-500 text-xs text-green-400">Verified ✅</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Loan Creation Area */}
                <div className="col-span-1 md:col-span-2">
                    <div className="bg-fintech-card p-8 rounded-xl border border-fintech-border shadow-lg">
                        <h2 className="text-xl font-bold text-white mb-6">Create New Loan Request</h2>

                        {message && (
                            <div className={`p-4 rounded-lg mb-6 text-sm ${message.includes('success') ? 'bg-fintech-success/20 text-fintech-success border border-fintech-success/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                                {message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Loan Amount (USDC)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="e.g. 500"
                                        required
                                        min="1"
                                        className="w-full bg-fintech-dark border border-fintech-border text-white rounded-lg p-3 outline-none focus:border-fintech-accent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Duration (Months)</label>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        placeholder="e.g. 12"
                                        required
                                        min="1"
                                        className="w-full bg-fintech-dark border border-fintech-border text-white rounded-lg p-3 outline-none focus:border-fintech-accent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Loan Purpose</label>
                                <textarea
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    placeholder="Describe how you plan to use this capital..."
                                    required
                                    rows="3"
                                    className="w-full bg-fintech-dark border border-fintech-border text-white rounded-lg p-3 outline-none focus:border-fintech-accent resize-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-fintech-accent hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors shadow-lg"
                            >
                                {loading ? 'Publishing Request...' : 'Publish Loan Request to Market'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BorrowerDashboard;
