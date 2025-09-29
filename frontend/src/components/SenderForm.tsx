'use client';

import { useState } from 'react';

type ShareMode = 'file' | 'text';

export default function SenderForm() {
  const [shareMode, setShareMode] = useState<ShareMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [recipientImages, setRecipientImages] = useState<File[]>([]);
  const [expiry, setExpiry] = useState<number>(3600); // 1 hour in seconds
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

    let resourceBlob: Blob;
    if (shareMode === 'file') {
      if (!file) {
        alert('Please select a file to share.');
        return;
      }
      resourceBlob = file;
    } else {
      if (textContent.trim() === '') {
        alert('Please enter some text to share.');
        return;
      }
      resourceBlob = new Blob([textContent], { type: 'text/plain' });
    }

    // TODO: Implement client-side encryption before uploading

    try {
      const formData = new FormData();
      formData.append('resource', resourceBlob, shareMode === 'file' ? file!.name : 'shared_content.txt');
      formData.append('expiry', (Math.floor(Date.now() / 1000) + expiry).toString());
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
    <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center text-gray-800">Create a Secure Link</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Share Mode Toggle */}
        <div className="flex justify-center p-1 bg-gray-200 rounded-md">
          <button type="button" onClick={() => setShareMode('file')} className={`w-1/2 py-2 rounded-md text-sm font-medium ${shareMode === 'file' ? 'bg-white shadow' : 'text-gray-600'}`}>File</button>
          <button type="button" onClick={() => setShareMode('text')} className={`w-1/2 py-2 rounded-md text-sm font-medium ${shareMode === 'text' ? 'bg-white shadow' : 'text-gray-600'}`}>Text</button>
        </div>

        {shareMode === 'file' ? (
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">Confidential File</label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        ) : (
          <div>
            <label htmlFor="text-content" className="block text-sm font-medium text-gray-700">Confidential Text</label>
            <textarea
              id="text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full h-32 px-3 py-2 mt-1 text-gray-700 bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter your secret message here..."
            />
          </div>
        )}

        <div>
          <label htmlFor="recipient-images" className="block text-sm font-medium text-gray-700">Recipient Faces</label>
          <input
            type="file"
            id="recipient-images"
            multiple
            onChange={handleRecipientImagesChange}
            className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">Time Limit (seconds)</label>
          <input
            type="number"
            id="expiry"
            value={expiry}
            onChange={(e) => setExpiry(Number(e.target.value))}
            className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="max-attempts" className="block text-sm font-medium text-gray-700">Max Attempts</label>
          <input
            type="number"
            id="max-attempts"
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(Number(e.target.value))}
            className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Generate Secure Link
        </button>
      </form>
      {secureLink && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Your Secure Link:</label>
          <input
            type="text"
            readOnly
            value={secureLink}
            className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
