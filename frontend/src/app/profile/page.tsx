"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import styles from './Profile.module.css';
import Pattern from '@/components/Pattern';
import ProfileInfo from '@/components/ProfileInfo';
import MyLinks from '@/components/MyLinks';
import SecuritySettings from '@/components/SecuritySettings';
import OnboardingSurvey from '@/components/OnboardingSurvey';
import { toast } from 'react-hot-toast';

interface UserProfile {
  onboardingCompleted: boolean;
  // other profile fields can be added here
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isConnected && address) {
        const userDocRef = doc(db, 'users', address);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          setUserProfile(profile);
          if (!profile.onboardingCompleted) {
            setShowOnboarding(true);
          }
        } else {
          // If no profile exists, create one
          const newProfile = { onboardingCompleted: false };
          await setDoc(userDocRef, newProfile);
          setUserProfile(newProfile);
          setShowOnboarding(true);
        }
      } else {
        router.push('/login');
      }
    };

    fetchUserProfile();
  }, [isConnected, address, router]);

  const finishOnboarding = () => {
    setShowOnboarding(false);
    router.push('/?tour=true');
  };

  const handleSurveyComplete = async (answers: Record<string, string>) => {
    if (address) {
      const userDocRef = doc(db, 'users', address);
      try {
        await updateDoc(userDocRef, {
          onboardingCompleted: true,
          surveyAnswers: answers,
        });
        toast.success('Thank you for your feedback!');
        finishOnboarding();
      } catch (error) {
        toast.error('Could not save your feedback. Please try again.');
      }
    }
  };

  const handleSurveySkip = async () => {
    if (address) {
      const userDocRef = doc(db, 'users', address);
      try {
        await updateDoc(userDocRef, {
          onboardingCompleted: true,
        });
        finishOnboarding();
      } catch (error) {
        toast.error('Could not update your profile. Please try again.');
      }
    }
  };

  if (!isConnected || !userProfile) {
    return (
      <main className={styles.container}>
        <p>Loading profile...</p>
      </main>
    );
  }

  if (showOnboarding) {
    return <OnboardingSurvey onComplete={handleSurveyComplete} onSkip={handleSurveySkip} />;
  }

  return (
    <main className={styles.container}>
      <Pattern />
      <div className={styles.content}>
        <h1 className={styles.title}>My Profile</h1>
        
        <ProfileInfo user={{ uid: address }} />
        <MyLinks user={{ uid: address }} />
        <SecuritySettings user={{ uid: address }} />

      </div>
    </main>
  );
}
