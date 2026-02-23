import React from 'react';

const Dashboard = () => {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-white">Platform Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Stat Card 1 */}
                <div className="bg-fintech-card p-6 rounded-xl border border-fintech-border shadow-lg">
                    <p className="text-slate-400 text-sm font-medium mb-1">Total Assets Locked</p>
                    <p className="text-2xl font-bold text-white">$12,450.00</p>
                    <p className="text-fintech-success text-sm mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                        +2.4% today
                    </p>
                </div>

                {/* Stat Card 2 */}
                <div className="bg-fintech-card p-6 rounded-xl border border-fintech-border shadow-lg">
                    <p className="text-slate-400 text-sm font-medium mb-1">Your Active Loans</p>
                    <p className="text-2xl font-bold text-white">2</p>
                    <p className="text-slate-400 text-sm mt-2">Next payment in 4 days</p>
                </div>

                {/* Stat Card 3 */}
                <div className="bg-fintech-card p-6 rounded-xl border border-fintech-border shadow-lg">
                    <p className="text-slate-400 text-sm font-medium mb-1">Credit Score</p>
                    <p className="text-2xl font-bold text-fintech-success">780 / 850</p>
                    <p className="text-slate-400 text-sm mt-2">Excellent standing</p>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
