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
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';

import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { aambaWallet } from './wallets/aambaWallet';
import { metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';

const config = getDefaultConfig({
  appName: 'MicroFin',
  projectId: '452cd38a8eefe3df3531bcf91c4d930c', // Valid public WalletConnect ID for testing
  chains: [mainnet, polygon, optimism, arbitrum, base],
  wallets: [
    {
      groupName: 'Microfinance Smart Contract Wallets',
      wallets: [aambaWallet],
    },
    {
      groupName: 'Other Providers',
      wallets: [metaMaskWallet, walletConnectWallet],
    },
  ],
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RainbowKitProvider theme={darkTheme({
            accentColor: '#3b82f6',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}>
            <App />
          </RainbowKitProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
