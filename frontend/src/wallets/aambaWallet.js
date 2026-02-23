import { injected } from 'wagmi/connectors';

export const aambaWallet = () => ({
    id: 'aamba-custom-wallet',
    name: 'Aamba Smart Wallet',
    iconUrl: 'https://ui-avatars.com/api/?name=Aamba&background=3b82f6&color=fff',
    iconBackground: '#3b82f6',
    // Change to true once you have built your custom browser extension 
    // that injects `window.aamba` into the browser DOM
    installed: typeof window !== 'undefined' && typeof window.aamba !== 'undefined',
    downloadUrls: {
        chrome: 'https://chrome.google.com/webstore/detail/your-custom-wallet',
        browserExtension: 'https://your-custom-wallet.com'
    },
    extension: {
        instructions: {
            learnMoreUrl: 'https://your-custom-wallet.com/learn-more',
            steps: [
                {
                    description: 'Install the Aamba Smart Wallet extension to interact with our protocol smart contracts.',
                    step: 'install',
                    title: 'Install Extension',
                },
                {
                    description: 'Refresh the browser to detect your new customized crypto wallet.',
                    step: 'refresh',
                    title: 'Refresh Browser',
                }
            ]
        }
    },
    createConnector: (walletDetails) => {
        // This allows Wagmi+RainbowKit to connect to your custom browser extension.
        // Replace 'window.aamba' with whatever global variable your extension injects.
        const isOurWalletInstalled = typeof window !== 'undefined' && typeof window.aamba !== 'undefined';

        const connector = injected({
            target: isOurWalletInstalled ? {
                id: 'aambaProvider',
                name: 'Aamba Smart Wallet',
                provider: window.aamba
            } : 'metaMask', // Fallback to standard injected provider for development testing
        });

        return typeof connector === 'function' ? connector(walletDetails) : connector;
    },
});
