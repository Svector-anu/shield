'use client';

import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-hot-toast';

interface FaceVerificationProps {
  onVerificationResult: (descriptor: Float32Array | null) => void;
  setInfo: (message: string) => void;
}

export default function FaceVerification({ onVerificationResult, setInfo }: FaceVerificationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        setInfo('Loading AI models...');
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setInfo('Please position your face in the frame.');
      } catch (e) {
        setInfo('Error: Could not load AI models.');
        console.error('Model loading error:', e);
      }
    };
    loadModels();
  }, [setInfo]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast.error('Could not start camera. Please grant permission and refresh.');
        console.error('Camera error:', err);
      }
    };

    if (modelsLoaded) {
      startCamera();
    }
  }, [modelsLoaded]);

  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    faceapi.matchDimensions(canvas, video);

    const interval = setInterval(async () => {
      if (video.paused || video.ended || video.videoWidth === 0) {
        return;
      }
      const detections = await faceapi.detectAllFaces(video)
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      const resizedDetections = faceapi.resizeResults(detections, video);
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
      }

      if (detections.length > 0 && detections[0].descriptor) {
        onVerificationResult(detections[0].descriptor);
        setInfo('Face detected. Ready to verify.');
      } else {
        onVerificationResult(null);
        setInfo('Please position your face in the frame.');
      }
    }, 300);

    return () => clearInterval(interval);
  };

  return (
    <div className="relative w-full max-w-xs mx-auto">
      <video ref={videoRef} autoPlay muted onPlay={handleVideoPlay} className="w-full rounded-lg" />
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
    </div>
  );
}
