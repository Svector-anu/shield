import React from 'react';
import './globals.css';
import StyledComponentsRegistry from '../lib/StyledComponentsRegistry';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';


export const metadata = {
  title: 'Shield - Secure Sharing',
  description: 'Decentralized and secure file and message sharing.',
}

import { Providers } from './providers';
import '@rainbow-me/rainbowkit/styles.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/Shld.png" sizes="any" />
        <link rel="apple-touch-icon" href="/Shld.png" />
      </head>
      <body>
        <Providers>
          <StyledComponentsRegistry>
            <Toaster />
            <Navbar />
            {children}
          </StyledComponentsRegistry>
        </Providers>
      </body>
    </html>
  )
}
