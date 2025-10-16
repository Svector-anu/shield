'use client';

import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

interface FaceVerificationProps {
  onVerificationResult: (descriptor: Float32Array | null) => void;
  setInfo: (message: string) => void;
}

export default function FaceVerification({ onVerificationResult, setInfo }: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/vision.worker.ts', import.meta.url));

    const handleWorkerMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'MODELS_LOADED':
          setModelsLoaded(true);
          setInfo('Please position your face in the frame.');
          break;
        case 'FACE_DETECTED':
          onVerificationResult(payload);
          setInfo('Face detected. Ready to verify.');
          break;
        case 'NO_FACE_DETECTED':
          onVerificationResult(null);
          setInfo('Please position your face in the frame.');
          break;
        case 'ERROR':
          setInfo(`Error: ${payload}`);
          toast.error(payload);
          break;
      }
    };

    workerRef.current.addEventListener('message', handleWorkerMessage);
    setInfo('Loading AI models...');
    workerRef.current.postMessage({ type: 'LOAD_MODELS' });

    return () => {
      workerRef.current?.removeEventListener('message', handleWorkerMessage);
      workerRef.current?.terminate();
    };
  }, [setInfo, onVerificationResult]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast.error('Could not start camera. Please grant permission and refresh.');
      }
    };

    if (modelsLoaded) {
      startCamera();
    }
  }, [modelsLoaded]);

  const handleVideoPlay = () => {
    const processFrame = async () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended && workerRef.current) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
          if (blob) {
            workerRef.current.postMessage({ type: 'DETECT_FACE', payload: { imageBlob: blob } });
          }
        }
      }
    };
    const interval = setInterval(processFrame, 500);
    return () => clearInterval(interval);
  };

  return (
    <div className="relative w-full max-w-xs mx-auto">
      <video ref={videoRef} autoPlay muted onPlay={handleVideoPlay} className="w-full rounded-lg" />
    </div>
  );
}
