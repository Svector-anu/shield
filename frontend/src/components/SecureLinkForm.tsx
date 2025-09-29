'use client';

import { useState } from 'react';
import styled from 'styled-components';

const SecureLinkForm = () => {
  const [file, setFile] = useState<File | null>(null);
  const [recipientImages, setRecipientImages] = useState<File[]>([]);
  const [expiry, setExpiry] = useState<number>(3600);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [secureLink, setSecureLink] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleRecipientImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setRecipientImages(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a confidential file.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('resource', file);
      formData.append('expiry', expiry.toString());
      formData.append('maxAttempts', maxAttempts.toString());

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
    } catch (error) {
      console.error(error);
      alert('An error occurred. Please check the console.');
    }
  };

  return (
    <StyledWrapper>
      <form className="form" onSubmit={handleSubmit}>
        <p className="title">Create a Secure Link</p>
        <p className="message">Upload a resource and define the terms for access.</p>
        
        {/* Custom styling for file inputs as floating labels don't work well with them */}
        <label className="file-label">
          <span>Confidential File</span>
          <input className="input" type="file" onChange={handleFileChange} required />
        </label>

        <label className="file-label">
          <span>Recipient Faces</span>
          <input className="input" type="file" multiple onChange={handleRecipientImagesChange} required />
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
        
        <button className="submit">Generate Link</button>

        {secureLink && (
          <div className="secureLinkContainer">
            <label>
              <input className="input" type="text" readOnly value={secureLink} placeholder=" " />
              <span>Your Secure Link</span>
            </label>
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
    gap: 20px; /* Increased gap for better spacing */
    max-width: 400px; /* Increased max-width */
    padding: 25px;
    border-radius: 20px;
    position: relative;
    background-color: #1a1a1a;
    color: #fff;
    border: 1px solid #333;
  }

  .title {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -1px;
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 30px;
    color: #00bfff;
  }

  .title::before {
    width: 18px;
    height: 18px;
  }

  .title::after {
    width: 18px;
    height: 18px;
    animation: pulse 1s linear infinite;
  }

  .title::before,
  .title::after {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    border-radius: 50%;
    left: 0px;
    background-color: #00bfff;
  }

  .message {
    font-size: 14.5px;
    color: rgba(255, 255, 255, 0.7);
  }

  .flex {
    display: flex;
    width: 100%;
    gap: 10px;
  }

  .form label {
    position: relative;
  }

  .form label .input {
    background-color: #333;
    color: #fff;
    width: 100%;
    padding: 20px 10px 10px 10px; /* Adjusted padding */
    outline: 0;
    border: 1px solid rgba(105, 105, 105, 0.397);
    border-radius: 10px;
  }

  /* Specific styles for file inputs */
  .file-label span {
    color: #00bfff;
    font-size: 0.7em;
    font-weight: 600;
    margin-bottom: 5px;
    display: block;
  }

  .file-label .input {
    padding: 10px;
  }

  .form label .input + span {
    color: rgba(255, 255, 255, 0.5);
    position: absolute;
    left: 10px;
    top: 15px; /* Centered vertically */
    font-size: 0.9em;
    cursor: text;
    transition: 0.3s ease;
  }

  .form label .input:placeholder-shown + span {
    top: 15px;
    font-size: 0.9em;
  }

  .form label .input:focus + span,
  .form label .input:valid + span {
    color: #00bfff;
    top: 4px;
    font-size: 0.7em;
    font-weight: 600;
  }

  .input {
    font-size: medium;
  }

  .submit {
    border: none;
    outline: none;
    padding: 10px;
    border-radius: 10px;
    color: #fff;
    font-size: 16px;
    transform: .3s ease;
    background-color: #00bfff;
  }

  .submit:hover {
    background-color: #00bfff96;
  }

  .secureLinkContainer {
    margin-top: 10px;
  }

  @keyframes pulse {
    from {
      transform: scale(0.9);
      opacity: 1;
    }

    to {
      transform: scale(1.8);
      opacity: 0;
    }
  }
`;

export default SecureLinkForm;