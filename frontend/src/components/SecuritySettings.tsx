"use client";

import { useState } from 'react';
import { User, deleteUser } from 'firebase/auth';
import toast from 'react-hot-toast';
import styles from './ProfileSection.module.css';
import parentStyles from '../app/profile/Profile.module.css';
import dangerStyles from './SecuritySettings.module.css';
import ConfirmModal from './ConfirmModal'; // Import the new modal component

export default function SecuritySettings({ user }: { user: User }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteAccount = async () => {
    const toastId = toast.loading('Deleting account...');
    try {
      await deleteUser(user);
      toast.success('Account deleted successfully.', { id: toastId });
      // The user will be redirected automatically by the auth state listener.
    } catch (error: any) {
      toast.error(`Error: ${error.message}. You may need to sign in again to perform this action.`, { id: toastId });
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
