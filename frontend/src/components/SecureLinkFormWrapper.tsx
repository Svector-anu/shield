'use client';

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { SiweMessage } from 'siwe';
import { auth, db } from '@/lib/firebase';
import { signInWithCustomToken, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitActionResource } from '@lit-protocol/auth-helpers';
import { useWriteContract } from 'wagmi';
import { appkit } from '@/app/providers';
import { doc, setDoc } from 'firebase/firestore';
import { isAddress, toHex } from 'viem';
import ShieldABI from '@/lib/Shield.json';

const litActionCode = `
  const go = async () => {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    const pinataData = {
      pinataContent: dataType === "json" ? JSON.parse(encryptedData) : encryptedData,
    };
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + pinataJwt },
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
  const [user, setUser] = useState<User | null>(null);
  const { address, chainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { writeContract, isSuccess, isError, error } = useWriteContract();

  const [shareMode, setShareMode] = useState<ShareMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [expiry, setExpiry] = useState<number>(3600);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [secureLink, setSecureLink] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [litNodeClient, setLitNodeClient] = useState<LitNodeClient | null>(null);
  const [isLitConnecting, setIsLitConnecting] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const faceApiWorker = useRef<Worker | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (!isConnected || !address || !chainId) {
      toast.error('Please connect your wallet first.');
      return;
    }
    setIsSigningIn(true);
    try {
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId,
      });
      const preparedMessage = message.prepareMessage();
      const signature = await signMessageAsync({ message: preparedMessage });

      const response = await fetch('/api/siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: preparedMessage, signature }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify signature');
      }

      const { token } = await response.json();
      await signInWithCustomToken(auth, token);
      toast.success('Signed in successfully!');
    } catch (e) {
      console.error('Sign-in failed:', e);
      toast.error('Sign-in failed. Please try again.');
      // If sign-in fails, we disconnect the wallet to ensure a clean state
      disconnect();
    } finally {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    if (isConnected && !user && !isSigningIn) {
      handleSignIn();
    }
  }, [isConnected, user, isSigningIn]);

  useEffect(() => {
    faceApiWorker.current = new Worker(new URL('../workers/vision.worker.ts', import.meta.url));
    faceApiWorker.current.onmessage = (event) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'MODELS_LOADED': setFeedbackMessage('AI models loaded.'); break;
        case 'FACE_DETECTED': setFaceDescriptor(payload); setFeedbackMessage('✅ Face data extracted.'); break;
        case 'NO_FACE_DETECTED': setFaceDescriptor(null); setFeedbackMessage('❌ No face detected.'); break;
        case 'ERROR': setFeedbackMessage(`Error: ${payload}`); break;
      }
    };
    faceApiWorker.current.postMessage({ type: 'LOAD_MODELS' });
    return () => faceApiWorker.current?.terminate();
  }, []);

  useEffect(() => {
    const connectToLit = async () => {
      setIsLitConnecting(true);
      try {
        const client = new LitNodeClient({ litNetwork: 'datil-test', debug: false });
        await client.connect();
        setLitNodeClient(client);
      } catch (err) {
        console.error("Error connecting to Lit Protocol:", err);
        toast.error("Could not connect to the decentralized network.");
      } finally {
        setIsLitConnecting(false);
      }
    };
    connectToLit();
  }, []);

  useEffect(() => {
    if (isSuccess) toast.success('Policy created on-chain successfully!');
    if (isError) toast.error(`On-chain transaction failed: ${error?.message || 'Unknown error'}`);
  }, [isSuccess, isError, error]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files && setFile(e.target.files[0]);
  const handleRecipientImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFeedbackMessage('Processing face...');
      faceApiWorker.current?.postMessage({ type: 'DETECT_FACE', payload: { imageBlob: e.target.files[0] } });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('You must be signed in.'); return; }
    if (!litNodeClient) { toast.error('Lit Protocol not connected.'); return; }
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress || !isAddress(contractAddress)) { toast.error("Invalid contract address."); return; }
    const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!pinataJwt) { toast.error("Pinata JWT not configured."); return; }
    if (!faceDescriptor) { toast.error('Please provide a recipient face.'); return; }

    setIsSubmitting(true);
    setFeedbackMessage('');

    try {
      let dataToEncrypt: CryptoJS.lib.WordArray;
      let mimeType: string = 'text/plain';

      if (shareMode === 'file') {
        if (!file) { toast.error('Please select a file.'); setIsSubmitting(false); return; }
        mimeType = file.type;
        const arrayBuffer = await file.arrayBuffer();
        dataToEncrypt = CryptoJS.lib.WordArray.create(arrayBuffer);
      } else {
        if (textContent.trim() === '') { toast.error('Please enter text.'); setIsSubmitting(false); return; }
        dataToEncrypt = CryptoJS.enc.Utf8.parse(textContent);
      }

      const secretKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
      const encryptedDataString = CryptoJS.AES.encrypt(dataToEncrypt, secretKey).toString();
      const faceDescriptorString = JSON.stringify(Array.from(faceDescriptor));

      setFeedbackMessage('Getting session signatures...');
      const resourceAbilityRequests = [{ resource: new LitActionResource('*'), ability: 'litAction:execute' as any }];
      const sessionSigs = await litNodeClient.getLitActionSessionSigs({ resourceAbilityRequests });

      setFeedbackMessage('Uploading to secure storage...');
      const [resourceResult, descriptorResult] = await Promise.all([
        litNodeClient.executeJs({ code: litActionCode, sessionSigs, jsParams: { encryptedData: encryptedDataString, dataType: 'string', pinataJwt } }),
        litNodeClient.executeJs({ code: litActionCode, sessionSigs, jsParams: { encryptedData: faceDescriptorString, dataType: 'json', pinataJwt } }),
      ]);

      const resourceCid = JSON.parse(resourceResult.response as string).cid;
      const faceCid = JSON.parse(descriptorResult.response as string).cid;
      if (!resourceCid || !faceCid) throw new Error('Failed to get CIDs from IPFS.');

      setFeedbackMessage('Confirm transaction in wallet...');
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
        resourceCid, faceCid, secretKey, mimeType,
        isText: shareMode === 'text',
        expiry: expiryTimestamp, maxAttempts,
        attempts: 0, valid: true,
      });

      const link = `${window.location.origin}/r/${policyId}`;
      setSecureLink(link);
      toast.success('Secure link generated!');
      setFeedbackMessage('');
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      toast.error(`Error: ${errorMessage}`);
      setFeedbackMessage('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => navigator.clipboard.writeText(secureLink).then(() => toast.success('Link copied!'), () => toast.error('Failed to copy.'));

  return (
    <StyledWrapper>
      <form className="form secure-link-form-selector" onSubmit={handleSubmit}>
        <p className="title">Create a Secure Link</p>
        <p className="message">
          {user ? `Signed in as: ${user.uid}` : 'Sign in with your wallet to begin.'}
        </p>
        
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
          <input className="input" type="file" accept="image/*" onChange={handleRecipientImagesChange} required />
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
          {isLitConnecting ? 'Connecting...' : (isSubmitting ? 'Generating...' : (user ? 'Generate Secure Link' : 'Sign in to Generate'))}
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
  /* Your existing styles remain unchanged */
  .form { display: flex; flex-direction: column; gap: 25px; max-width: 550px; padding: 40px; border-radius: 20px; position: relative; background-color: transparent; color: #fff; border: none; box-shadow: none; }
  .feedback-message { font-size: 14px; color: #00ff00; margin-top: 10px; text-align: center; }
  .title { font-size: 32px; font-weight: 600; letter-spacing: -1px; position: relative; display: flex; align-items: center; padding-left: 30px; color: #00ff00; }
  .title::before, .title::after { position: absolute; content: ""; height: 16px; width: 16px; border-radius: 50%; left: 0px; background-color: #00ff00; }
  .title::after { animation: pulse 1s linear infinite; }
  .message { font-size: 15px; color: rgba(255, 255, 255, 0.7); }
  .flex { display: flex; width: 100%; gap: 15px; }
  .form label { position: relative; }
  .form label .input { background-color: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); color: #fff; width: 100%; padding: 20px 10px 10px 10px; outline: 0; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; font-size: medium; }
  .form label .textarea { height: 120px; resize: none; }
  .file-label span { color: #00ff00; font-size: 0.75em; font-weight: 600; margin-bottom: 5px; display: block; }
  .file-label .input { padding: 10px; }
  .form label .input + span { color: rgba(255, 255, 255, 0.5); position: absolute; left: 10px; top: 15px; font-size: 1em; cursor: text; transition: 0.3s ease; }
  .form label .input:placeholder-shown + span { top: 15px; font-size: 1em; }
  .form label .input:focus + span, .form label .input:valid + span { color: #00ff00; top: 4px; font-size: 0.75em; font-weight: 600; }
  .submit { border: none; outline: none; padding: 12px; border-radius: 10px; color: #fff; font-size: 16px; transform: .3s ease; background-image: linear-gradient(45deg, #00ff00, #008000); box-shadow: 0 0 15px rgba(0, 255, 0, 0.4); font-weight: bold; transition: all 0.3s ease; }
  .submit:hover { transform: scale(1.05); box-shadow: 0 0 25px rgba(0, 255, 0, 0.7); }
  .submit:disabled { background-image: linear-gradient(45deg, #4b5563, #6b7280); box-shadow: none; cursor: not-allowed; transform: scale(1); }
  .secureLinkContainer { margin-top: 10px; }
  .secureLinkTitle { color: #00ff00; font-size: 0.75em; font-weight: 600; margin-bottom: 5px; display: block; }
  .link-wrapper { display: flex; align-items: center; gap: 10px; }
  .link-wrapper input { background-color: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); color: #fff; width: 100%; padding: 10px; outline: 0; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; font-size: 14px; }
  .link-wrapper button { border: none; outline: none; padding: 10px; border-radius: 10px; color: #fff; font-size: 14px; background-color: rgba(0, 255, 0, 0.5); cursor: pointer; transition: background-color 0.3s ease; }
  .link-wrapper button:hover { background-color: rgba(0, 255, 0, 0.8); }
  .toggle-container { display: flex; justify-content: center; padding: 4px; background-color: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; }
  .toggle-container button { width: 50%; padding: 8px 0; border-radius: 10px; border: none; background-color: transparent; color: rgba(255, 255, 255, 0.7); font-size: 14px; font-weight: 500; cursor: pointer; transition: background-color 0.3s ease; }
  .toggle-container button.active { background-color: #00ff00; color: #fff; box-shadow: 0 0 10px rgba(0, 255, 0, 0.5); }
  @keyframes pulse { from { transform: scale(0.9); opacity: 1; } to { transform: scale(1.8); opacity: 0; } }
  @media (max-width: 768px) { .form { padding: 20px; } .title { font-size: 24px; padding-left: 20px; } .flex { flex-direction: column; } }
`;

export default SecureLinkForm;