"use client";

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import styles from './Profile.module.css';
import Pattern from '@/components/Pattern';
import ProfileInfo from '@/components/ProfileInfo';
import MyLinks from '@/components/MyLinks';
import SecuritySettings from '@/components/SecuritySettings';

export default function ProfilePage() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <main className={styles.container}>
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    // This should ideally redirect to the login page.
    // For now, just showing a message.
    return (
      <main className={styles.container}>
        <p>Please sign in to view your profile.</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <Pattern />
      <div className={styles.content}>
        <h1 className={styles.title}>My Profile</h1>
        
        <ProfileInfo user={user} />
        <MyLinks user={user} />
        <SecuritySettings user={user} />

      </div>
    </main>
  );
}
