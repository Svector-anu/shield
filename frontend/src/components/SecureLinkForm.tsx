'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import CryptoJS from 'crypto-js';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitActionResource } from '@lit-protocol/auth-helpers';
import { useAccount, useWriteContract } from 'wagmi';
import { signMessage } from '@wagmi/core';
import { config } from '@/app/providers';
import { doc, setDoc } from 'firebase/firestore';
import { isAddress, toHex } from 'viem';
import ShieldABI from '@/lib/Shield.json';

// This is the Lit Action that will be used to upload to IPFS
// In a real app, you would fetch this from a secure location
// or have it version controlled.
const litActionCode = `
  const go = async () => {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    
    const pinataData = {
      pinataContent: dataType === "json" ? JSON.parse(encryptedData) : encryptedData,
    };

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + pinataJwt,
        },
        body: JSON.stringify(pinataData),
      });

      if (resp.ok) {
        const data = await resp.json();
        Lit.Actions.setResponse({ response: JSON.stringify({ cid: data.IpfsHash }) });
      } else {
        const errorText = await resp.text();
        console.error("Pinata error:", errorText);
        Lit.Actions.setResponse({ response: JSON.stringify({ error: 'Failed to pin to Pinata: ' + errorText }) });
      }
    } catch(e) {
      console.error("Error in Lit Action:", e);
      Lit.Actions.setResponse({ response: JSON.stringify({ error: 'An unexpected error occurred in the Lit Action.'}) });
    }
  };

  go();
`;


type ShareMode = 'file' | 'text';

const SecureLinkForm = () => {
  const [user] = useAuthState(auth);
  const { address, connector } = useAccount();
  const { data: hash, writeContract, isPending, isSuccess, isError, error } = useWriteContract();

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

  const [litNodeClient, setLitNodeClient] = useState<LitNodeClient | null>(null);
  const [isLitConnecting, setIsLitConnecting] = useState<boolean>(true);

  useEffect(() => {
    const connectToLit = async () => {
      setIsLitConnecting(true);
      try {
        const client = new LitNodeClient({
          litNetwork: 'datil-test', // Use the 'datil-test' testnet
          debug: false,
        });
        await client.connect();
        setLitNodeClient(client);
      } catch (err) {
        console.error("Error connecting to Lit Protocol:", err);
        toast.error("Could not connect to the decentralized network. Please refresh.");
      } finally {
        setIsLitConnecting(false);
      }
    };
    connectToLit();
  }, []);


  useEffect(() => {
    if (isSuccess) {
      toast.success('Policy created on-chain successfully!');
    }
    if (isError) {
      console.error("Transaction Error:", error);
      toast.error(`On-chain transaction failed: ${error?.message || 'Unknown error'}`);
    }
  }, [isSuccess, isError, error]);

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
    if (!user) {
      toast.error('You must be logged in to create a link.');
      return;
    }
    if (!address || !connector) {
        toast.error('Please connect your wallet first.');
        return;
    }
    if (!litNodeClient) {
      toast.error('Still connecting to the decentralized network. Please wait a moment.');
      return;
    }

    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress || !isAddress(contractAddress)) {
      toast.error("Invalid or missing contract address. Please check your .env.local file.");
      setIsSubmitting(false);
      return;
    }

    const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!pinataJwt) {
      toast.error("Pinata JWT is not configured. Please check your .env.local file.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage('');

    let dataToEncrypt: CryptoJS.lib.WordArray;
    let mimeType: string = 'text/plain';

    if (shareMode === 'file') {
      if (!file) {
        toast.error('Please select a file to share.');
        setIsSubmitting(false);
        return;
      }
      mimeType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      dataToEncrypt = CryptoJS.lib.WordArray.create(arrayBuffer);
    } else {
      if (textContent.trim() === '') {
        toast.error('Please enter some text to share.');
        setIsSubmitting(false);
        return;
      }
      dataToEncrypt = CryptoJS.enc.Utf8.parse(textContent);
    }

    if (!faceDescriptor) {
      toast.error('Please provide a recipient face and wait for it to be processed.');
      setIsSubmitting(false);
      return;
    }

    try {
      const secretKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
      const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, secretKey);
      const encryptedDataString = encrypted.toString();
      
      const faceDescriptorString = JSON.stringify(Array.from(faceDescriptor));

      setFeedbackMessage('Waiting for wallet signature...');

      // Get session signatures
      const resourceAbilityRequests = [{
        resource: new LitActionResource('*'),
        ability: 'litAction:execute',
      }];

      const authNeededCallback = async (params: any) => {
        const { messageToSign } = params;

        if (!address) {
          toast.error("Wallet not connected, cannot sign message");
          throw new Error("Wallet not connected");
        }

        const signature = await signMessage(config, { connector, message: messageToSign });

        return {
          sig: signature,
          derivedVia: 'web3.eth.personal.sign',
          signedMessage: messageToSign,
          address: address,
        };
      };

      const sessionSigs = await litNodeClient.getSessionSigs({
        resourceAbilityRequests,
        authNeededCallback,
      });

      setFeedbackMessage('Uploading to secure storage via Lit Protocol...');

      const uploadPromises = [
        litNodeClient.executeJs({
          code: litActionCode,
          sessionSigs,
          jsParams: {
            encryptedData: encryptedDataString,
            dataType: 'string',
            pinataJwt: pinataJwt,
          },
        }),
        litNodeClient.executeJs({
          code: litActionCode,
          sessionSigs,
          jsParams: {
            encryptedData: faceDescriptorString,
            dataType: 'json',
            pinataJwt: pinataJwt,
          },
        }),
      ];

      const [resourceResult, descriptorResult] = await Promise.all(uploadPromises);

      const resourceCid = JSON.parse(resourceResult.response as string).cid;
      const faceCid = JSON.parse(descriptorResult.response as string).cid;

      if (!resourceCid || !faceCid) {
        console.error("Lit Action Response (Resource):", resourceResult.response);
        console.error("Lit Action Response (Descriptor):", descriptorResult.response);
        throw new Error('Failed to get CIDs from IPFS upload via Lit Protocol.');
      }

      setFeedbackMessage('Please confirm the transaction in your wallet...');
      
      const policyId = toHex(window.crypto.getRandomValues(new Uint8Array(32)));
      const expiryTimestamp = Math.floor(Date.now() / 1000) + expiry;

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: ShieldABI.abi,
        functionName: 'createPolicy',
        args: [policyId, expiryTimestamp, maxAttempts],
      });
      
      setFeedbackMessage('Creating secure link...');
      
      await setDoc(doc(db, 'policies', policyId), {
        creatorId: user.uid,
        resourceCid: resourceCid,
        faceCid: faceCid,
        secretKey: secretKey,
        mimeType: mimeType,
        isText: shareMode === 'text',
        expiry: expiryTimestamp,
        maxAttempts: maxAttempts,
        attempts: 0,
        valid: true,
      });

      const link = `${window.location.origin}/r/${policyId}`;
      setSecureLink(link);
      toast.success('Secure link generated successfully!');
      setFeedbackMessage('');

    } catch (error) {
      console.error(error);
      toast.error('An error occurred. Please check the console.');
      setFeedbackMessage('An error occurred. Please try again.');
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
      <form className="form secure-link-form-selector" onSubmit={handleSubmit}>
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

        <label className="file-label recipient-face-selector">
          <span>Recipient Face</span>
          <input className="input" type="file" accept="image/*" onChange={handleRecipientImagesChange} required disabled={!modelsLoaded} />
          {feedbackMessage && <p className="feedback-message">{feedbackMessage}</p>}
        </label>

        <div className="flex access-rules-selector">
          <label>
            <input className="input" type="number" value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} placeholder=" " required />
            <span>Time Limit (seconds)</span>
          </label>
          <label>
            <input className="input" type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} placeholder=" " required />
            <span>Max Attempts</span>
          </label>
        </div>  
        
        <button className="submit generate-link-button-selector" type="submit" disabled={isSubmitting || !faceDescriptor || !user || isLitConnecting}>
          {isLitConnecting ? 'Connecting to Network...' : (isSubmitting ? 'Generating...' : (user ? 'Generate Link' : 'Sign in to Generate Link'))}
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
    gap: 25px;
    max-width: 550px;
    padding: 40px;
    border-radius: 20px;
    position: relative;
    background-color: transparent;
    color: #fff;
    border: none;
    box-shadow: none;
  }

  .feedback-message {
    font-size: 14px;
    color: #00ff00;
    margin-top: 10px;
    text-align: center;
  }

  .title {
    font-size: 32px;
    font-weight: 600;
    letter-spacing: -1px;
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 30px;
    color: #00ff00;
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
    background-color: #00ff00;
  }

  .message { font-size: 15px; color: rgba(255, 255, 255, 0.7); }
  .flex { display: flex; width: 100%; gap: 15px; }
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

  .file-label span { color: #00ff00; font-size: 0.75em; font-weight: 600; margin-bottom: 5px; display: block; }
  .file-label .input { padding: 10px; }

  .form label .input + span {
    color: rgba(255, 255, 255, 0.5);
    position: absolute;
    left: 10px;
    top: 15px;
    font-size: 1em;
    cursor: text;
    transition: 0.3s ease;
  }

  .form label .input:placeholder-shown + span { top: 15px; font-size: 1em; }
  .form label .input:focus + span, .form label .input:valid + span { color: #00ff00; top: 4px; font-size: 0.75em; font-weight: 600; }

  .input { font-size: medium; }

  .submit { 
    border: none; 
    outline: none; 
    padding: 12px; 
    border-radius: 10px; 
    color: #fff; 
    font-size: 16px; 
    transform: .3s ease; 
    background-image: linear-gradient(45deg, #00ff00, #008000);
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
    font-weight: bold; 
    transition: all 0.3s ease;
  }
  .submit:hover { 
    transform: scale(1.05);
    box-shadow: 0 0 25px rgba(0, 255, 0, 0.7);
  }
  .submit:disabled {
    background-image: linear-gradient(45deg, #4b5563, #6b7280);
    box-shadow: none;
    cursor: not-allowed;
    transform: scale(1);
  }
  
  .secureLinkContainer {
    margin-top: 10px;
  }

  .secureLinkTitle {
    color: #00ff00;
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
    background-color: rgba(0, 255, 0, 0.5);
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .link-wrapper button:hover {
    background-color: rgba(0, 255, 0, 0.8);
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
    background-color: #00ff00;
    color: #fff;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  }

  @keyframes pulse { from { transform: scale(0.9); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }

  @media (max-width: 768px) {
    .form {
      padding: 20px;
    }

    .title {
      font-size: 24px;
      padding-left: 20px;
    }

    .flex {
      flex-direction: column;
    }
  }
`;

export default SecureLinkForm;
