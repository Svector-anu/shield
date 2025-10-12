'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, lightTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
  localhost,
} from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from 'react';

const config = getDefaultConfig({
  appName: 'Shield',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '', // Replace with your WalletConnect Project ID
  chains: [
    mainnet, 
    polygon, 
    optimism, 
    arbitrum, 
    base, 
    sepolia, 
    ...(process.env.NODE_ENV === 'development' ? [localhost] : [])
  ],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export { config, queryClient };

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={lightTheme({
          accentColor: '#00ff00',
          accentColorForeground: 'white',
        })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}