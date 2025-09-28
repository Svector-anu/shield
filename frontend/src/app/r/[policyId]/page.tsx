'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function ReceiverPage() {
  const params = useParams();
  const policyId = params.policyId as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string>('');

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Could not access camera. Please grant permission and try again.');
      }
    }
  };

  const handleVerify = async () => {
    setVerificationStatus('verifying');
    // TODO:
    // 1. Capture a frame from the video stream
    // 2. Send the frame to the face verification service (e.g., AWS Rekognition)
    // 3. The service will compare the face with the pre-uploaded recipient faces
    // 4. Based on the result, call the backend's verify endpoint
    const success = Math.random() > 0.5; // Placeholder for verification result
    try {
            const response = await fetch(`http://localhost:3001/api/verify/${policyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success }),
      });
      if (response.ok) {
        setVerificationStatus('success');
        // TODO: Decrypt and display the resource
      } else {
        const data = await response.json();
        setVerificationStatus('failed');
        setError(data.message || 'Verification failed.');
      }
    } catch (err) {
      setVerificationStatus('failed');
      setError('An error occurred during verification.');
    }
  };

  useEffect(() => {
    startCamera();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-800">Face Verification</h1>
        {error && <p className="text-red-500">{error}</p>}

        {verificationStatus === 'idle' && (
          <>
            <p className="text-gray-600">
              To access the secure resource, you need to verify your identity using your camera.
            </p>
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-md border"></video>
            <button
              onClick={handleVerify}
              className="w-full py-3 mt-4 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Start Verification
            </button>
          </>
        )}

        {verificationStatus === 'verifying' && <p className="text-lg font-semibold">Verifying...</p>}

        {verificationStatus === 'success' && (
          <div>
            <h2 className="text-2xl font-bold text-green-600">Verification Successful!</h2>
            <p className="mt-2 text-gray-600">Here is your secure resource:</p>
            {/* TODO: Display the decrypted resource here */}
            <div className="p-4 mt-4 bg-gray-200 border rounded-md">
              [Decrypted Content]
            </div>
          </div>
        )}

        {verificationStatus === 'failed' && (
          <div>
            <h2 className="text-2xl font-bold text-red-600">Verification Failed</h2>
            <p className="mt-2 text-gray-600">{error || 'The link may be expired or invalid.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
