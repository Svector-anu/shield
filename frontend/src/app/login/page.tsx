"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import styles from './Login.module.css';
import Pattern from '@/components/Pattern';
import GoogleIcon from '@/components/GoogleIcon';
import GitHubIcon from '@/components/GitHubIcon';
import MailIcon from '@/components/MailIcon';
import LockIcon from '@/components/LockIcon';
import { EyeIcon, EyeOffIcon } from '@/components/EyeIcons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data().onboardingCompleted) {
          router.push('/');
        } else {
          router.push('/profile');
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleAuthAction = async () => {
    setError(null);
    setLoading(true);
    try {
      const authFn = isSignUp ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      await authFn(auth, email, password);
      // The onAuthStateChanged listener will handle the redirect
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle the redirect
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <Pattern />
      <div className={styles.form}>
        <h1 className={styles.title}>{isSignUp ? 'Create Account' : 'Sign In'}</h1>
        
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <div className={styles.inputWrapper}>
            <MailIcon />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your Email"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <div className={styles.inputWrapper}>
            <LockIcon />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Password"
              className={styles.input}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.eyeButton}>
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {!isSignUp && (
          <div className={styles.options}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" />
              Remember me
            </label>
            <Link href="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
          </div>
        )}

        <button onClick={handleAuthAction} className={styles.button}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </button>

        <div className={styles.switchAuth}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => setIsSignUp(!isSignUp)} className={styles.switchLink}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        <div className={styles.divider}>Or With</div>

        <div className={styles.socialLogins}>
          <button onClick={() => handleSocialSignIn(new GoogleAuthProvider())} className={styles.socialButton}>
            <GoogleIcon />
            Google
          </button>
          <button onClick={() => handleSocialSignIn(new GithubAuthProvider())} className={styles.socialButton}>
            <GitHubIcon />
            GitHub
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </main>
  );
}
