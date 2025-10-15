'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import SecureLinkForm from "@/components/SecureLinkForm";
import Pattern from "@/components/Pattern";

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component mounts
    setIsClient(true);
  }, []);

  // Render a fallback on the server and during the initial client render
  if (!isClient) {
    return <div>Loading...</div>;
  }

  // Render the full component only on the client
  return (
    <>
      <main className="p-4">
        <Pattern />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <SecureLinkForm />
        </div>
      </main>
    </>
  );
}
