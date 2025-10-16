'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Pattern from '@/components/Pattern';
import CryptoJS from 'crypto-js';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import ShieldABI from '@/lib/Shield.json';
import { toast } from 'react-hot-toast';
import styles from './ReceiverPage.module.css';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'failed' | 'invalid';
interface Policy {
  faceCid: string;
  resourceCid: string;
  secretKey: string;
  mimeType: string;
  isText: boolean;
  valid: boolean;
  maxAttempts: number;
  attempts: number;
}

const contractConfig = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
  abi: ShieldABI.abi,
};

// Cosine similarity function to compare two embeddings
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (magA * magB);
};

export default function ReceiverPage() {
  const params = useParams();
  const policyId = params.policyId as `0x${string}`;
  const { isConnected } = useAccount();
  
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('Loading...');
  const [decryptedDataUrl, setDecryptedDataUrl] = useState<string>('');
  const [policy, setPolicy] = useState<Policy | null>(null);
  
  const [referenceImageBlob, setReferenceImageBlob] = useState<Blob | null>(null);
  const [liveSelfieBlob, setLiveSelfieBlob] = useState<Blob | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const { data: onChainValid, error: readError } = useReadContract({
    ...contractConfig,
    functionName: 'isPolicyValid',
    args: [policyId],
  });

  // Effect to initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/vision.worker.ts', import.meta.url));
    workerRef.current.postMessage({ type: 'LOAD_MODELS' });

    const handleWorkerMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === 'COMPARISON_RESULT') {
        handleComparisonResult(payload.success);
      } else if (type === 'ERROR') {
        setError(`AI Worker Error: ${payload}`);
        setVerificationStatus('failed');
      }
    };
    workerRef.current.addEventListener('message', handleWorkerMessage);

    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (readError) throw new Error('Could not check policy on-chain.');
        if (onChainValid === false) throw new Error('Policy is invalid, expired, or has no attempts left.');

        // Fetch policy from the gasless backend
        const response = await fetch(`/api/getPolicy/${policyId}`);
        if (!response.ok) {
            throw new Error('Policy not found or backend error.');
        }
        const policyData = await response.json();
        
        if (!policyData.valid) {
          setVerificationStatus('invalid');
          setError('This link has been revoked.');
        } else {
          setPolicy(policyData);
          const imageUrl = `https://ipfs.io/ipfs/${policyData.faceCid}`;
          const imgResponse = await fetch(imageUrl);
          if (!imgResponse.ok) throw new Error('Failed to fetch reference image.');
          
          const encryptedData = await imgResponse.text();
          const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, policyData.secretKey);
          const decryptedBase64 = decryptedBytes.toString(CryptoJS.enc.Utf8);
          
          const blob = await (await fetch(decryptedBase64)).blob();
          setReferenceImageBlob(blob);
          
          setInfo('Please take a selfie for verification.');
          startCamera();
        }
      } catch (e: any) {
        setVerificationStatus('invalid');
        setError(e.message || 'An error occurred.');
      }
    };
    if (policyId) loadInitialData();
  }, [policyId, onChainValid, readError]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError('Could not start camera. Please grant permission.');
    }
  };

  const takeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(blob => {
        if (blob) setLiveSelfieBlob(blob);
      }, 'image/jpeg');
    }
  };

  const handleVerify = () => {
    if (!referenceImageBlob || !liveSelfieBlob) {
      toast.error("Missing images for comparison.");
      return;
    }
    setVerificationStatus('verifying');
    setInfo('Comparing faces...');
    workerRef.current?.postMessage({ 
      type: 'COMPARE_FACES', 
      payload: { image1: referenceImageBlob, image2: liveSelfieBlob } 
    });
  };

  const handleComparisonResult = async (success: boolean) => {
    setInfo('Logging verification attempt...');
    try {
      const response = await fetch('/api/logAttempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId, success }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to log attempt.');
      }

      toast.success('Verification logged on-chain.');
      setInfo('Decrypting resource...');
      if (policy) {
        await decryptAndSetResource(policy);
      }
    } catch (err: any) {
      setVerificationStatus('failed');
      setError(err.message);
      toast.error(err.message);
    }
  };

  const decryptAndSetResource = async (policyData: Policy) => {
    // Decryption logic remains the same
  };

  const renderContent = () => {
    // Render logic remains the same
  };

  const renderStatus = () => {
    switch (verificationStatus) {
      case 'idle':
        return (
          <div>
            <p className={styles.info}>{info}</p>
            <div className={styles.photoContainer}>
              <div className={styles.photoWrapper}>
                <h3>Reference Photo</h3>
                {referenceImageBlob && <img src={URL.createObjectURL(referenceImageBlob)} alt="Reference" />}
              </div>
              <div className={styles.photoWrapper}>
                <h3>Your Selfie</h3>
                {liveSelfieBlob ? <img src={URL.createObjectURL(liveSelfieBlob)} alt="Snapshot" /> : <video ref={videoRef} autoPlay muted />}
              </div>
            </div>
            {!liveSelfieBlob ? (
              <button onClick={takeSnapshot} className={styles.button}>Take Snapshot</button>
            ) : (
              <button onClick={handleVerify} className={styles.button}>Verify</button>
            )}
          </div>
        );
      // Other cases remain the same
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Pattern />
      <div className={styles.contentWrapper}>
        <h1 className={styles.title}>Face Verification</h1>
        {renderStatus()}
      </div>
    </div>
  );
}
