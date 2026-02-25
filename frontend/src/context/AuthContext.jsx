import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useDisconnect } from 'wagmi';

const AuthContext = createContext();

export const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

export const AuthProvider = ({ children }) => {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { disconnect } = useDisconnect();

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const parsedInfo = JSON.parse(userInfo);
            setUserProfile(parsedInfo);
            api.defaults.headers.common['Authorization'] = `Bearer ${parsedInfo.token}`;
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            setLoading(true);
            const response = await api.post('/users/login', { email, password });
            if (response.data.success) {
                const data = response.data.data;
                setUserProfile(data);
                localStorage.setItem('userInfo', JSON.stringify(data));
                api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                return { success: true };
            }
        } catch (error) {
            console.error("Login failed", error);
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        } finally {
            setLoading(false);
        }
    };

    const walletLogin = async (walletAddress) => {
        try {
            setLoading(true);
            const response = await api.post('/users/wallet-login', { walletAddress });
            if (response.data.success) {
                const data = response.data.data;
                setUserProfile(data);
                localStorage.setItem('userInfo', JSON.stringify(data));
                api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                return { success: true };
            }
        } catch (error) {
            console.error("Wallet login failed", error);
            return { success: false, message: 'Wallet login failed' };
        } finally {
            setLoading(false);
        }
    };

    const register = async (name, email, password) => {
        try {
            setLoading(true);
            const response = await axios.post('http://localhost:5000/api/users/register', { name, email, password });
            if (response.data.success) {
                const data = response.data.data;
                setUserProfile(data);
                localStorage.setItem('userInfo', JSON.stringify(data));
                axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                return { success: true };
            }
        } catch (error) {
            console.error("Registration failed", error);
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('isOnboarded');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('userRole');
        setUserProfile(null);
        delete axios.defaults.headers.common['Authorization'];
        disconnect(); // Also disconnect wagmi wallet if any
    };

    const updateRole = async (role) => {
        if (!userProfile) return;
        try {
            const response = await api.put(`/users/role`, { role });
            if (response.data.success) {
                const data = response.data.data;
                setUserProfile(data);
                localStorage.setItem('userInfo', JSON.stringify(data));
            }
        } catch (err) {
            console.error("Update role failed", err);
        }
    }

    const submitKyc = async (documentType, documentNumber, image, walletAddress = null, txHash = null) => {
        if (!userProfile) return;
        try {
            const response = await api.post(`/users/kyc`, {
                documentType,
                documentNumber,
                image,
                walletAddress,
                txHash
            });


            if (response.data.success) {
                const data = response.data.data;
                setUserProfile(data);
                localStorage.setItem('userInfo', JSON.stringify(data));
                return true;
            }
        } catch (err) {
            console.error("KYC failed", err.response?.data || err);
            return false;
        }
    }

    return (
        <AuthContext.Provider value={{
            userProfile,
            loading,
            isAuthenticated: !!userProfile, // Renamed from isConnected to avoid conflict with wagmi
            login,
            walletLogin,
            register,
            logout,
            updateRole,
            submitKyc
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
