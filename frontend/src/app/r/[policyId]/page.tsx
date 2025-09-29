'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function ReceiverPage() {
  const params = useParams();
  const policyId = params.policyId as string;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string>('');
  const [resourceContent, setResourceContent] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [contentType, setContentType] = useState<string>('');

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
    const success = Math.random() > 0.5; // Placeholder

    try {
      const verifyResponse = await fetch(`http://localhost:3001/api/verify/${policyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success }),
      });

      if (verifyResponse.ok) {
        setVerificationStatus('success');

        try {
          const resourceResponse = await fetch(`http://localhost:3001/api/resource/${policyId}`);
          if (!resourceResponse.ok) throw new Error('Could not retrieve resource location.');
          
          const { cid } = await resourceResponse.json();
          const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;

          const contentResponse = await fetch(ipfsUrl);
          if (!contentResponse.ok) throw new Error('Could not fetch content from IPFS.');

          const type = contentResponse.headers.get('Content-Type') || 'application/octet-stream';
          setContentType(type);

          if (type.startsWith('text/')) {
            const text = await contentResponse.text();
            setResourceContent(text);
          } else if (type.startsWith('image/')) {
            const blob = await contentResponse.blob();
            setFileUrl(URL.createObjectURL(blob));
          } else {
            // For other types like PDF, provide a direct download link
            const blob = await contentResponse.blob();
            setFileUrl(URL.createObjectURL(blob));
          }

        } catch (err) {
          setError('Verification succeeded, but failed to fetch the resource.');
          console.error(err);
        }
      } else {
        const data = await verifyResponse.json();
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

    const renderContent = () => {
    if (!contentType) return <p>Fetching resource...</p>;

    if (contentType.startsWith('text/')) {
      return <pre className="whitespace-pre-wrap font-sans">{resourceContent}</pre>;
    }

    if (fileUrl) {
      if (contentType.startsWith('image/')) {
        return <img src={fileUrl} alt="Decrypted resource" className="max-w-full h-auto rounded-md" />;
      } else {
        return (
          <a href={fileUrl} download className="font-medium text-blue-600 hover:underline">
            Download File
          </a>
        );
      }
    }

    // If content is not text and fileUrl is not ready yet
    return <p>Loading resource...</p>;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-gray-800">Face Verification</h1>
        {error && <p className="text-red-500">{error}</p>}

        {verificationStatus === 'idle' && (
          <>
            <p className="text-gray-600">To access the secure resource, you need to verify your identity using your camera.</p>
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
            <div className="p-4 mt-4 bg-gray-200 border rounded-md text-left">
              {renderContent()}
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
