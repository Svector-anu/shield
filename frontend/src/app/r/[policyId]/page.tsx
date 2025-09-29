'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import Pattern from '@/components/Pattern';
import CryptoJS from 'crypto-js';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'failed' | 'invalid';

export default function ReceiverPage() {
  const params = useParams();
  const policyId = params.policyId as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('Loading AI models...');
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [decryptedDataUrl, setDecryptedDataUrl] = useState<string>('');
  const [faceCid, setFaceCid] = useState<string>('');
  const [liveDescriptor, setLiveDescriptor] = useState<Float32Array | null>(null);

  // Load models and initial policy status on mount
  useEffect(() => {
    const loadInitialData = async () => {
      const MODEL_URL = '/models';
      try {
        setInfo('Loading AI models...');
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// ... (imports and component setup remain the same)

  // Load models and initial policy status on mount
  useEffect(() => {
    const loadInitialData = async () => {
      const MODEL_URL = '/models';
      try {
        setInfo('Loading AI models...');
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);

        setInfo('Checking policy status...');
        const policyRef = doc(db, 'policies', policyId);
        const policySnap = await getDoc(policyRef);

        if (!policySnap.exists()) {
          throw new Error('Policy not found. The link may be invalid.');
        }
        
        const policyData = policySnap.data();
        
        // TODO: We are not checking against the smart contract yet.
        const isStillValid = policyData.valid; 

        if (!isStillValid) {
          setVerificationStatus('invalid');
          setError('This link has expired or the maximum attempts have been reached.');
        } else {
          setFaceCid(policyData.faceCid); // Store the faceCid
          setInfo('Please position your face in the frame.');
        }
      } catch (e: any) {
        setVerificationStatus('invalid');
        setError(e.message || 'An error occurred while loading.');
        console.error('Initial loading error:', e);
      }
    };
    loadInitialData();
  }, [policyId]);

// ... (rest of the component remains the same, but will need further refactoring)
      } catch (e: any) {
        setVerificationStatus('invalid');
        setError(e.message || 'An error occurred while loading.');
        console.error('Initial loading error:', e);
      }
    };
    loadInitialData();
  }, [policyId]);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      if (!modelsLoaded || verificationStatus !== 'idle') return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Could not access camera. Please grant permission and try again.');
        setVerificationStatus('failed');
      }
    };
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [modelsLoaded, verificationStatus]);

  // Continuous face detection on video play
  useEffect(() => {
    let detectionInterval: NodeJS.Timeout;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const handleVideoPlay = () => {
      if (!video || !canvas || verificationStatus !== 'idle') return;

      const displaySize = { width: video.clientWidth, height: video.clientHeight };
      faceapi.matchDimensions(canvas, displaySize);

      detectionInterval = setInterval(async () => {
        if (video.paused || video.ended) return;
        
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        const context = canvas.getContext('2d');
        if (!context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
          const resizedDetection = faceapi.resizeResults(detection, displaySize);
          const drawBox = new faceapi.draw.DrawBox(resizedDetection.detection.box, { boxColor: '#00ff00' });
          drawBox.draw(canvas);
          setLiveDescriptor(detection.descriptor);
          setInfo('Face detected. Ready to verify.');
        } else {
          setLiveDescriptor(null);
          setInfo('Please position your face in the frame.');
        }
      }, 300);
    };

    if (video) {
      video.addEventListener('play', handleVideoPlay);
    }

    return () => {
      if (video) {
        video.removeEventListener('play', handleVideoPlay);
      }
      clearInterval(detectionInterval);
    };
  }, [verificationStatus]);

  const decryptAndSetResource = async (resourceCid: string, secretKey: string) => {
    try {
      setInfo('Fetching encrypted resource...');
      const encryptedResponse = await fetch(`https://ipfs.io/ipfs/${resourceCid}`);
      if (!encryptedResponse.ok) throw new Error('Failed to fetch encrypted resource from IPFS.');
      const encryptedData = await encryptedResponse.text();

      setInfo('Decrypting resource...');
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      const decryptedDataUrl = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedDataUrl) throw new Error('Decryption failed. The key may be incorrect or the data corrupted.');

      setDecryptedDataUrl(decryptedDataUrl);
      setVerificationStatus('success');
    } catch (err: any) {
      throw err;
    }
  };

  const handleVerify = async () => {
    if (!liveDescriptor) {
      setError('Could not get a stable face detection. Please try again.');
      return;
    }
    setVerificationStatus('verifying');
    setError('');

    try {
      setInfo('Comparing faces...');
      const descriptorUrl = `https://ipfs.io/ipfs/${faceCid}`;
      const descriptorResponse = await fetch(descriptorUrl);
      if (!descriptorResponse.ok) throw new Error('Could not fetch face descriptor.');
      const referenceDescriptor = new Float32Array(await descriptorResponse.json());

      const faceMatcher = new faceapi.FaceMatcher(referenceDescriptor);
      const bestMatch = faceMatcher.findBestMatch(liveDescriptor);
      const success = bestMatch.distance < 0.6;

      setInfo('Logging verification attempt...');
      const verifyResponse = await fetch(`http://localhost:3001/api/verify/${policyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success }),
      });
      const verifyResult = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verifyResult.error || 'Failed to log verification attempt.');
      if (!success || !verifyResult.success) throw new Error('Face mismatch. Verification failed.');

      setInfo('Verification successful! Decrypting resource...');
      await decryptAndSetResource(verifyResult.resourceCid, verifyResult.secretKey);

    } catch (err: any) {
      setVerificationStatus('failed');
      setError(err.message || 'An unknown error occurred.');
      console.error(err);
    }
  };

  const handleRetry = () => {
    setError('');
    setInfo('Please position your face in the frame.');
    setVerificationStatus('idle');
  };

  const renderContent = () => {
    if (!decryptedDataUrl) return <p>Loading resource...</p>;
    const [header, base64Data] = decryptedDataUrl.split(',');
    if (!header || !base64Data) return <p>Invalid data format.</p>;
    const mimeType = header.match(/:(.*?);/)?.[1];
    if (mimeType?.startsWith('text/')) {
      const textContent = atob(base64Data);
      return <pre className="whitespace-pre-wrap font-sans text-gray-200">{textContent}</pre>;
    }
    if (mimeType?.startsWith('image/')) {
      return <img src={decryptedDataUrl} alt="Decrypted resource" className="max-w-full h-auto rounded-md" />;
    }
    return <a href={decryptedDataUrl} download="decrypted_resource" className="font-medium text-blue-400 hover:underline">Download File</a>;
  };

  const renderStatus = () => {
    switch (verificationStatus) {
      case 'idle':
      case 'verifying':
        return (
          <>
            <p className="text-gray-400">{info}</p>
            <div className="relative w-full mt-4 overflow-hidden rounded-lg border border-gray-700">
              <video ref={videoRef} autoPlay playsInline muted className="w-full"></video>
              <canvas ref={canvasRef} className="absolute top-0 left-0" />
            </div>
            <button
              onClick={handleVerify}
              disabled={!modelsLoaded || verificationStatus === 'verifying' || !liveDescriptor}
              className="w-full py-3 mt-4 font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100"
            >
              {verificationStatus === 'verifying' ? 'Verifying...' : (modelsLoaded ? 'Start Verification' : 'Loading...')}
            </button>
          </>
        );
      case 'success':
        return (
          <div>
            <h2 className="text-2xl font-bold text-green-400">Verification Successful!</h2>
            <p className="mt-2 text-gray-400">Here is your secure resource:</p>
            <div className="p-4 mt-4 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg text-left">
              {renderContent()}
            </div>
          </div>
        );
      case 'failed':
        return (
          <div>
            <h2 className="text-2xl font-bold text-red-500">Verification Failed</h2>
            <p className="mt-2 text-gray-400">{error}</p>
            <button
              onClick={handleRetry}
              className="w-full py-3 mt-6 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        );
      case 'invalid':
        return (
          <div>
            <h2 className="text-2xl font-bold text-red-500">Link Invalid</h2>
            <p className="mt-2 text-gray-400">{error}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Pattern />
      <div className="w-full max-w-md p-8 space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-100">Face Verification</h1>
        {renderStatus()}
      </div>
    </div>
  );
}