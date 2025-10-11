'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
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
import { createAppKit } from '@reown/appkit';
import { ReownAuthentication } from '@reown/appkit-siwx';

export const { config } = createAppKit({
  appName: 'Shield',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '', // Replace with your WalletConnect Project ID
  networks: [
    mainnet, 
    polygon, 
    optimism, 
    arbitrum, 
    base, 
    sepolia, 
    ...(process.env.NODE_ENV === 'development' ? [localhost] : [])
  ],
  ssr: true, // If your dApp uses server side rendering (SSR)
  siwx: new ReownAuthentication(),
});

const queryClient = new QueryClient();

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