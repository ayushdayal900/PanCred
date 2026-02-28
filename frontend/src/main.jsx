import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import '@rainbow-me/rainbowkit/styles.css';
import {
    getDefaultConfig,
    RainbowKitProvider,
    darkTheme
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, sepolia, polygon, optimism, arbitrum, base } from 'wagmi/chains';

import {
    QueryClientProvider,
    QueryClient,
} from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';

import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
    window.Buffer = window.Buffer || Buffer;
}

import { PanCredWallet } from './wallets/PanCredWallet';
import { injectedWallet, metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';

// ── AWS Amplify (for Face Liveness guest credentials) ──────────────────────
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
Amplify.configure({
    Auth: {
        Cognito: {
            identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
            allowGuestAccess: true,
            identityPoolRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
        },
    },
});

const config = getDefaultConfig({
    appName: 'MicroFin',
    projectId: 'b1eef86bafdfb9db1124deb507c6e076',
    chains: [sepolia, mainnet, polygon, optimism, arbitrum, base],
});

const queryClient = new QueryClient();

import { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <RainbowKitProvider theme={darkTheme({
                        accentColor: '#2563eb', // New Stronger Blue
                        accentColorForeground: 'white',
                        borderRadius: 'large',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}>
                        <Toaster position="top-right" toastOptions={{
                            className: 'premium-toast',
                            style: {
                                background: '#ffffff',
                                color: '#1e293b',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '500',
                                padding: '12px 16px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#16a34a',
                                    secondary: '#ffffff',
                                },
                                style: {
                                    borderLeft: '4px solid #16a34a',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: '#dc2626',
                                    secondary: '#ffffff',
                                },
                                style: {
                                    borderLeft: '4px solid #dc2626',
                                },
                            },
                            loading: {
                                style: {
                                    borderLeft: '4px solid #2563eb',
                                },
                            },
                        }} />
                        <App />
                    </RainbowKitProvider>
                </AuthProvider>
            </QueryClientProvider>
        </WagmiProvider>
    </StrictMode>,
)
