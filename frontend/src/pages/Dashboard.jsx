import React from 'react';
import { useAuth } from '../context/AuthContext';
import BorrowerDashboard from './BorrowerDashboard';
import LenderDashboard from './LenderDashboard';

const Dashboard = () => {
    const { userProfile } = useAuth();

    if (!userProfile) {
        return <div className="text-center mt-20 text-white">Loading profile...</div>;
    }

    if (userProfile.role === 'Lender') {
        return <LenderDashboard />;
    } else if (userProfile.role === 'Borrower') {
        return <BorrowerDashboard />;
    } else {
        return <div className="text-center mt-20 text-white">Unrecognized role.</div>;
    }
};

export default Dashboard;
