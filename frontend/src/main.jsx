import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import '@rainbow-me/rainbowkit/styles.css';
import {
    RainbowKitProvider,
    darkTheme,
    connectorsForWallets
} from '@rainbow-me/rainbowkit';
import {
    injectedWallet,
    metaMaskWallet,
    walletConnectWallet
} from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';

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

const projectId = 'b1eef86bafdfb9db1124deb507c6e076';

const connectors = connectorsForWallets([
    {
        groupName: 'PanCred Smart Wallets',
        wallets: [PanCredWallet, injectedWallet, metaMaskWallet, walletConnectWallet],
    },
], {
    appName: 'MicroFin',
    projectId,
});

const config = createConfig({
    connectors,
    chains: [sepolia],
    transports: {
        [sepolia.id]: http(),
    },
});

const queryClient = new QueryClient();

import { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <RainbowKitProvider theme={darkTheme({
                        accentColor: '#2563eb',
                        accentColorForeground: 'white',
                        borderRadius: 'large',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}>
                        <Toaster position="top-right" />
                        <App />
                    </RainbowKitProvider>
                </AuthProvider>
            </QueryClientProvider>
        </WagmiProvider>
    </StrictMode>,
)
