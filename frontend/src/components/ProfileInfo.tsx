"use client";

import { useState } from 'react';
import { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import toast from 'react-hot-toast';
import styles from './ProfileSection.module.css';
import parentStyles from '../app/profile/Profile.module.css';

interface ProfileInfoProps {
  user: User;
}

export default function ProfileInfo({ user }: ProfileInfoProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName === user.displayName) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Updating profile...');

    try {
      await updateProfile(user, { displayName });
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
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={user.email || ''}
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
        <button type="submit" disabled={isSubmitting || displayName === user.displayName} className={styles.button}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </section>
  );
}
