"use client";

import React from 'react';
import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './ProfileSection.module.css';
import parentStyles from '../app/profile/Profile.module.css';
import dangerStyles from './SecuritySettings.module.css';
import ConfirmModal from './ConfirmModal';

export default function SecuritySettings({ user }: { user: { uid: string } }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    const toastId = toast.loading('Deleting account...');
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await deleteDoc(userDocRef);
      toast.success('Account deleted successfully.', { id: toastId });
      router.push('/');
    } catch (error: any) {
      toast.error(`Error: ${error.message}.`, { id: toastId });
    } finally {
      setIsModalOpen(false);
    }
  };

  const openConfirmationModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <section className={parentStyles.section} id="settings">
        <h2 className={parentStyles.sectionTitle}>Security Settings</h2>
        
        {/* Future settings can go here */}

        <div className={dangerStyles.dangerZone}>
          <h3 className={dangerStyles.dangerTitle}>Danger Zone</h3>
          <div className={dangerStyles.dangerContent}>
            <p>Once you delete your account, there is no going back. Please be certain.</p>
            <button onClick={openConfirmationModal} className={dangerStyles.dangerButton}>
              Delete My Account
            </button>
          </div>
        </div>
      </section>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Confirm Account Deletion"
        message="Are you sure you want to permanently delete your account? This action cannot be undone."
      />
    </>
  );
}
