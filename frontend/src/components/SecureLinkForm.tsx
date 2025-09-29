'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import CryptoJS from 'crypto-js';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';

type ShareMode = 'file' | 'text';

const SecureLinkForm = () => {
  const [shareMode, setShareMode] = useState<ShareMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [expiry, setExpiry] = useState<number>(3600);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [secureLink, setSecureLink] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

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
      } catch (e) {
        setFeedbackMessage('Error: Could not load AI models.');
        console.error('Model loading error:', e);
      }
    };
    loadModels();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleRecipientImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!modelsLoaded) {
      setFeedbackMessage('Please wait, AI models are still loading.');
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      const image = e.target.files[0];
      setFeedbackMessage('Processing face...');
      try {
        const imageElement = await faceapi.bufferToImage(image);
        const detection = await faceapi
          .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        if (detection) {
          setFaceDescriptor(detection.descriptor);
          setFeedbackMessage('✅ Face data extracted successfully.');
        } else {
          setFaceDescriptor(null);
          setFeedbackMessage('❌ No face detected. Please try another image.');
        }
      } catch (error) {
        setFeedbackMessage('An error occurred during face processing.');
        console.error(error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMessage('');

    let dataToEncrypt: string;
    let originalFileName = 'shared_content.txt';

    if (shareMode === 'file') {
      if (!file) {
        toast.error('Please select a file to share.');
        setIsSubmitting(false);
        return;
      }
      originalFileName = file.name;
      dataToEncrypt = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    } else {
      if (textContent.trim() === '') {
        toast.error('Please enter some text to share.');
        setIsSubmitting(false);
        return;
      }
      dataToEncrypt = `data:text/plain;base64,${btoa(textContent)}`;
    }

    if (!faceDescriptor) {
      toast.error('Please provide a recipient face and wait for it to be processed.');
      setIsSubmitting(false);
      return;
    }

    try {
      const secretKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
      const encryptedData = CryptoJS.AES.encrypt(dataToEncrypt, secretKey).toString();
      const encryptedBlob = new Blob([encryptedData], { type: 'text/plain' });

      const formData = new FormData();
      formData.append('resource', encryptedBlob, `encrypted_${originalFileName}`);
      // Convert descriptor to a string for transport
      formData.append('recipientFaceDescriptor', JSON.stringify(Array.from(faceDescriptor)));
      const absoluteExpiry = Math.floor(Date.now() / 1000) + expiry;
      formData.append('expiry', absoluteExpiry.toString());
      formData.append('maxAttempts', maxAttempts.toString());
      formData.append('secretKey', secretKey);

      const response = await fetch('http://localhost:3001/api/policy', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to create policy');
      }

      const { policyId } = await response.json();
      const link = `${window.location.origin}/r/${policyId}`;
      setSecureLink(link);
      toast.success('Secure link generated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('An error occurred. Please check the console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(secureLink).then(() => {
      toast.success('Link copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
      toast.error('Failed to copy link.');
    });
  };

  return (
    <StyledWrapper>
      <form className="form" onSubmit={handleSubmit}>
        <p className="title">Create a Secure Link</p>
        <p className="message">Upload a resource and define the terms for access.</p>
        
        <div className="toggle-container">
          <button type="button" onClick={() => setShareMode('file')} className={shareMode === 'file' ? 'active' : ''}>File</button>
          <button type="button" onClick={() => setShareMode('text')} className={shareMode === 'text' ? 'active' : ''}>Text</button>
        </div>

        {shareMode === 'file' ? (
          <label className="file-label">
            <span>Confidential File</span>
            <input className="input" type="file" onChange={handleFileChange} required />
          </label>
        ) : (
          <label>
            <textarea className="input textarea" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder=" " required />
            <span>Confidential Text</span>
          </label>
        )}

        <label className="file-label">
          <span>Recipient Face</span>
          <input className="input" type="file" accept="image/*" onChange={handleRecipientImagesChange} required disabled={!modelsLoaded} />
          {feedbackMessage && <p className="feedback-message">{feedbackMessage}</p>}
        </label>

        <div className="flex">
          <label>
            <input className="input" type="number" value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} placeholder=" " required />
            <span>Time Limit (seconds)</span>
          </label>
          <label>
            <input className="input" type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} placeholder=" " required />
            <span>Max Attempts</span>
          </label>
        </div>  
        
        <button className="submit" type="submit" disabled={isSubmitting || !faceDescriptor}>
          {isSubmitting ? 'Generating...' : 'Generate Link'}
        </button>

        {secureLink && (
          <div className="secureLinkContainer">
            <span className="secureLinkTitle">Your Secure Link</span>
            <div className="link-wrapper">
              <input type="text" readOnly value={secureLink} />
              <button type="button" onClick={handleCopy}>Copy</button>
            </div>
          </div>
        )}
      </form>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .form {
    display: flex;
    flex-direction: column;
    gap: 25px; /* Increased gap */
    max-width: 550px; /* Increased width */
    padding: 40px; /* Increased padding */
    border-radius: 20px;
    position: relative;
    background-color: transparent;
    color: #fff;
    border: none;
    box-shadow: none;
  }

  .feedback-message {
    font-size: 14px;
    color: #00bfff;
    margin-top: 10px;
    text-align: center;
  }

  .title {
    font-size: 32px; /* Increased font size */
    font-weight: 600;
    letter-spacing: -1px;
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 30px;
    color: #00bfff;
  }

  .title::before { width: 18px; height: 18px; }
  .title::after { width: 18px; height: 18px; animation: pulse 1s linear infinite; }
  .title::before, .title::after {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    border-radius: 50%;
    left: 0px;
    background-color: #00bfff;
  }

  .message { font-size: 15px; color: rgba(255, 255, 255, 0.7); } /* Increased font size */
  .flex { display: flex; width: 100%; gap: 15px; } /* Increased gap */
  .form label { position: relative; }

  .form label .input {
    background-color: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    color: #fff;
    width: 100%;
    padding: 20px 10px 10px 10px;
    outline: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: medium;
  }
  
  .form label .textarea {
    height: 120px;
    resize: none;
  }

  .file-label span { color: #00bfff; font-size: 0.75em; font-weight: 600; margin-bottom: 5px; display: block; } /* Increased font size */
  .file-label .input { padding: 10px; }

  .form label .input + span {
    color: rgba(255, 255, 255, 0.5);
    position: absolute;
    left: 10px;
    top: 15px;
    font-size: 1em; /* Increased font size */
    cursor: text;
    transition: 0.3s ease;
  }

  .form label .input:placeholder-shown + span { top: 15px; font-size: 1em; } /* Increased font size */
  .form label .input:focus + span, .form label .input:valid + span { color: #00bfff; top: 4px; font-size: 0.75em; font-weight: 600; } /* Increased font size */

  .input { font-size: medium; }

  .submit { 
    border: none; 
    outline: none; 
    padding: 12px; 
    border-radius: 10px; 
    color: #fff; 
    font-size: 16px; 
    transform: .3s ease; 
    background-image: linear-gradient(45deg, #00bfff, #1e90ff);
    box-shadow: 0 0 15px rgba(0, 191, 255, 0.4);
    font-weight: bold; 
    transition: all 0.3s ease;
  }
  .submit:hover { 
    transform: scale(1.05);
    box-shadow: 0 0 25px rgba(0, 191, 255, 0.7);
  }
  
  .secureLinkContainer {
    margin-top: 10px;
  }

  .secureLinkTitle {
    color: #00bfff;
    font-size: 0.75em;
    font-weight: 600;
    margin-bottom: 5px;
    display: block;
  }

  .link-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .link-wrapper input {
    background-color: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    color: #fff;
    width: 100%;
    padding: 10px;
    outline: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-size: 14px;
  }

  .link-wrapper button {
    border: none;
    outline: none;
    padding: 10px;
    border-radius: 10px;
    color: #fff;
    font-size: 14px;
    background-color: rgba(0, 191, 255, 0.5);
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .link-wrapper button:hover {
    background-color: rgba(0, 191, 255, 0.8);
  }

  .toggle-container {
    display: flex;
    justify-content: center;
    padding: 4px;
    background-color: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }
  .toggle-container button {
    width: 50%;
    padding: 8px 0;
    border-radius: 10px;
    border: none;
    background-color: transparent;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }
  .toggle-container button.active {
    background-color: #00bfff;
    color: #fff;
    box-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
  }

  @keyframes pulse { from { transform: scale(0.9); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }
`;

export default SecureLinkForm;
