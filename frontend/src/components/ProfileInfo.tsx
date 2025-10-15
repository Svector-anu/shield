"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import styles from './ProfileSection.module.css';
import parentStyles from '../app/profile/Profile.module.css';

interface ProfileInfoProps {
  user: { uid: string };
}

export default function ProfileInfo({ user }: ProfileInfoProps) {
  const [displayName, setDisplayName] = useState('');
  const [initialDisplayName, setInitialDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user && user.uid) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profile = userDocSnap.data();
          setDisplayName(profile.displayName || '');
          setInitialDisplayName(profile.displayName || '');
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName === initialDisplayName) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Updating profile...');

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { displayName });
      setInitialDisplayName(displayName);
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={parentStyles.section} id="profile">
      <h2 className={parentStyles.sectionTitle}>Profile Information</h2>
      <form onSubmit={handleUpdateProfile} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="walletAddress">Wallet Address</label>
          <input
            id="walletAddress"
            type="text"
            value={user.uid || ''}
            disabled
            className={styles.input}
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            className={styles.input}
          />
        </div>
        <button type="submit" disabled={isSubmitting || displayName === initialDisplayName} className={styles.button}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </section>
  );
}
