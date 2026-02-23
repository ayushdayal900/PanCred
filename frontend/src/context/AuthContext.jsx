import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const syncWalletWithBackend = async () => {
            if (isConnected && address) {
                setLoading(true);
                try {
                    // Send wallet address to backend to auth or register
                    const response = await axios.post('http://localhost:5000/api/users/auth', {
                        walletAddress: address
                    });

                    if (response.data.success) {
                        setUserProfile(response.data.data);
                    }
                } catch (error) {
                    console.error("Backend Auth Error:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setUserProfile(null);
            }
        };

        syncWalletWithBackend();
    }, [isConnected, address]);

    const updateRole = async (role) => {
        if (!userProfile) return;
        try {
            const response = await axios.put(`http://localhost:5000/api/users/${userProfile._id}/role`, { role });
            if (response.data.success) {
                setUserProfile(response.data.data);
            }
        } catch (err) {
            console.error("Update role failed", err);
        }
    }

    const submitKyc = async (documentType, documentNumber) => {
        if (!userProfile) return;
        try {
            const response = await axios.post(`http://localhost:5000/api/users/${userProfile._id}/kyc`, {
                documentType,
                documentNumber
            });
            if (response.data.success) {
                setUserProfile(response.data.data);
                return true;
            }
        } catch (err) {
            console.error("KYC failed", err);
            return false;
        }
    }

    return (
        <AuthContext.Provider value={{
            userProfile,
            loading,
            isConnected,
            address,
            disconnectWallet: disconnect,
            updateRole,
            submitKyc
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
