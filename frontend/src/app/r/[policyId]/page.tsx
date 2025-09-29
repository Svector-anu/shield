'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

export default function ReceiverPage() {
  const params = useParams();
  const policyId = params.policyId as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('Loading AI models...');
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);

  const [resourceContent, setResourceContent] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [contentType, setContentType] = useState<string>('');

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setInfo('To access the secure resource, you need to verify your identity using your camera.');
      } catch (e) {
        setError('Failed to load AI models. Please refresh the page.');
        console.error('Model loading error:', e);
      }
    };
    loadModels();
    startCamera();
  }, []);

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
    setError('');

    try {
      // 1. Get CIDs for the reference face and the resource from the backend
      setInfo('Fetching verification data...');
      const policyResponse = await fetch(`http://localhost:3001/api/resource/${policyId}`);
      if (!policyResponse.ok) throw new Error('Could not retrieve policy data.');
      const { resourceCid, faceCid } = await policyResponse.json();

      // 2. Load the reference face image from IPFS
      setInfo('Loading reference face...');
      const referenceImageUrl = `https://ipfs.io/ipfs/${faceCid}`;
      const referenceImage = await faceapi.fetchImage(referenceImageUrl);

      // 3. Detect face and compute descriptor for the reference image
      setInfo('Analyzing reference face...');
      const referenceResult = await faceapi
        .detectSingleFace(referenceImage, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!referenceResult) throw new Error('Could not detect a face in the reference image.');

      // 4. Detect face and compute descriptor for the live video feed
      setInfo('Analyzing your face... Please hold still.');
      if (!videoRef.current) throw new Error('Video feed not available.');
      const liveResult = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!liveResult) throw new Error('Could not detect your face. Please ensure you are centered and well-lit.');

      // 5. Compare the two faces
      setInfo('Comparing faces...');
      const faceMatcher = new faceapi.FaceMatcher(referenceResult);
      const bestMatch = faceMatcher.findBestMatch(liveResult.descriptor);
      const success = bestMatch.distance < 0.6; // 0.6 is a common threshold for good matches

      // 6. Log the attempt to the blockchain via the backend
      setInfo('Logging verification attempt...');
      const verifyResponse = await fetch(`http://localhost:3001/api/verify/${policyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Failed to log verification attempt.');
      }

      // This part remains the same, but the error handling above is the key change.
      if (success) {
        setVerificationStatus('success');
        // ... (rest of the success logic)
      } else {
        throw new Error('Face mismatch. Verification failed.');
      }

    } catch (err: any) {
      setVerificationStatus('failed');
      setError(err.message || 'An unknown error occurred.');
      console.error(err);
    }
  };

  const renderContent = () => {
    if (!contentType) return <p>Fetching resource...</p>;
    if (contentType.startsWith('text/')) return <pre className="whitespace-pre-wrap font-sans text-gray-200">{resourceContent}</pre>;
    if (fileUrl) {
      if (contentType.startsWith('image/')) return <img src={fileUrl} alt="Decrypted resource" className="max-w-full h-auto rounded-md" />;
      return <a href={fileUrl} download className="font-medium text-blue-400 hover:underline">Download File</a>;
    }
    return <p>Loading resource...</p>;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl shadow-blue-500/10 text-center">
        <h1 className="text-3xl font-bold text-gray-100">Face Verification</h1>
        {error && <p className="text-red-400">{error}</p>}

        {(verificationStatus === 'idle' || verificationStatus === 'verifying') && (
          <>
            <p className="text-gray-400">{info}</p>
            <div className="relative w-full mt-4 overflow-hidden rounded-lg border border-gray-700">
              <video ref={videoRef} autoPlay playsInline className="w-full"></video>
              {verificationStatus === 'verifying' && (
                <div className="absolute inset-0">
                  <div className="scanner-line"></div>
                </div>
              )}
            </div>
            <button
              onClick={handleVerify}
              disabled={!modelsLoaded || verificationStatus === 'verifying'}
              className="w-full py-3 mt-4 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {verificationStatus === 'verifying' ? 'Verifying...' : (modelsLoaded ? 'Start Verification' : 'Loading Models...')}
            </button>
          </>
        )}

        {verificationStatus === 'success' && (
          <div>
            <h2 className="text-2xl font-bold text-green-400">Verification Successful!</h2>
            <p className="mt-2 text-gray-400">Here is your secure resource:</p>
            <div className="p-4 mt-4 bg-gray-800 border border-gray-700 rounded-lg text-left">
              {renderContent()}
            </div>
          </div>
        )}

        {verificationStatus === 'failed' && (
          <div>
            <h2 className="text-2xl font-bold text-red-500">Verification Failed</h2>
            <p className="mt-2 text-gray-400">{error || 'The link may be expired or invalid.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}