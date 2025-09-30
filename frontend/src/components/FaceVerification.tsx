'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import * as faceapi from 'face-api.js';
import { toast } from 'react-hot-toast';
import Webcam from 'react-webcam';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Plane, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface FaceVerificationProps {
  onVerificationResult: (descriptor: Float32Array | null) => void;
  setInfo: (message: string) => void;
}

function VideoPlane({ video }: { video: HTMLVideoElement }) {
  const texture = useTexture(video.srcObject ? video.src : '/fallback-image.png');
  if (texture.image instanceof HTMLVideoElement) {
    texture.image.srcObject = video.srcObject;
    texture.image.play();
  }

  return (
    <Plane args={[16, 9]}>
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </Plane>
  );
}


export default function FaceVerification({ onVerificationResult, setInfo }: FaceVerificationProps) {
  const webcamRef = useRef<Webcam>(null);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);

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
      } catch (e) {
        setInfo('Error: Could not load AI models.');
        console.error('Model loading error:', e);
        toast.error('Error loading AI models. Please refresh.');
      }
    };
    loadModels();
  }, [setInfo]);

  useEffect(() => {
    if (modelsLoaded && cameraReady) {
      setInfo('Please position your face in the frame.');
      const interval = setInterval(async () => {
        if (webcamRef.current && webcamRef.current.video) {
          const video = webcamRef.current.video;
          if (video.readyState < 3) return;

          const detections = await faceapi.detectAllFaces(video)
            .withFaceLandmarks()
            .withFaceDescriptors();

          if (detections.length > 0 && detections[0].descriptor) {
            onVerificationResult(detections[0].descriptor);
            setInfo('Face detected. Ready to verify.');
          } else {
            onVerificationResult(null);
            setInfo('Searching for a face...');
          }
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [modelsLoaded, cameraReady, onVerificationResult, setInfo]);

  return (
    <div className="relative w-full max-w-xs mx-auto aspect-video rounded-lg overflow-hidden bg-gray-800">
      <Suspense fallback={<div className="text-white text-center p-4">Loading 3D Scene...</div>}>
        <Canvas>
          <OrbitControls />
          {webcamRef.current && webcamRef.current.video && (
            <VideoPlane video={webcamRef.current.video} />
          )}
        </Canvas>
      </Suspense>
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        onUserMedia={() => setCameraReady(true)}
        onUserMediaError={(err) => {
          toast.error('Camera permission denied. Please enable it in your browser settings.');
          console.error(err);
        }}
        className="absolute top-0 left-0 w-full h-full opacity-0" // Hidden but functional
      />
      {!modelsLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <p className="text-white">Loading AI Models...</p>
        </div>
      )}
      {modelsLoaded && !cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <p className="text-white">Waiting for camera...</p>
        </div>
      )}
    </div>
  );
}