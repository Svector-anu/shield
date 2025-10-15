"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import styles from './MyLinks.module.css';
import parentStyles from '../app/profile/Profile.module.css';

interface Policy {
  id: string;
  expiry: number; // Changed from Timestamp to number
  attempts: number;
  maxAttempts: number;
  valid: boolean;
}

export default function MyLinks({ user }: { user: { uid: string } }) {
  const [links, setLinks] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const q = query(collection(db, 'policies'), where('creatorId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const userLinks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Policy));
        setLinks(userLinks);
      } catch (error: any) {
        toast.error(`Failed to fetch links: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.uid) {
      fetchLinks();
    }
  }, [user]);

  const handleCopyLink = (id: string) => {
    const link = `${window.location.origin}/r/${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const handleRevokeLink = async (id: string) => {
    const toastId = toast.loading('Revoking link...');
    try {
      const linkRef = doc(db, 'policies', id);
      await updateDoc(linkRef, { valid: false });
      setLinks(links.map(link => link.id === id ? { ...link, valid: false } : link));
      toast.success('Link revoked successfully!', { id: toastId });
    } catch (error: any) {
      toast.error(`Failed to revoke link: ${error.message}`, { id: toastId });
    }
  };

  const getStatus = (link: Policy) => {
    if (!link.valid) return <span className={styles.revoked}>Revoked</span>;
    if (link.expiry * 1000 < Date.now()) return <span className={styles.expired}>Expired</span>;
    return <span className={styles.active}>Active</span>;
  };

  return (
    <section className={parentStyles.section} id="my-links">
      <h2 className={parentStyles.sectionTitle}>My Shared Links</h2>
      {isLoading ? (
        <p>Loading links...</p>
      ) : links.length === 0 ? (
        <p>You haven't created any links yet.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Policy ID</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Attempts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map(link => (
                <tr key={link.id}>
                  <td data-label="Policy ID" className={styles.policyId}>{link.id}</td>
                  <td data-label="Status">{getStatus(link)}</td>
                  <td data-label="Expires">{new Date(link.expiry * 1000).toLocaleString()}</td>
                  <td data-label="Attempts">{link.attempts} / {link.maxAttempts}</td>
                  <td data-label="Actions" className={styles.actions}>
                    <button onClick={() => handleCopyLink(link.id)}>Copy</button>
                    {link.valid && <button onClick={() => handleRevokeLink(link.id)} className={styles.revokeButton}>Revoke</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
