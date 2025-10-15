"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from './Navbar.module.css';
import UserMenu from './UserMenu';
import { useState } from 'react';
import MenuIcon from './MenuIcon';
import CloseIcon from './CloseIcon';

export default function Navbar() {
  const [user] = useAuthState(auth);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.brand}>
        <Image src="/Shld.png" alt="Shield Logo" width={32} height={32} />
        <span className={styles.brandText}>Shield</span>
      </Link>
      <div className={styles.menuToggle} onClick={() => setIsMenuOpen(!isMenuOpen)}>
        {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
      </div>
      <div className={`${styles.links} ${isMenuOpen ? styles.active : ''}`}>
        {user ? (
          <>
            <div className="connect-wallet-button-selector">
              <ConnectButton />
            </div>
            <UserMenu />
          </>
        ) : (
          <Link href="/login" className={styles.link}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}