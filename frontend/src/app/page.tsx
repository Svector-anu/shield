'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import SecureLinkForm from "@/components/SecureLinkForm";
import Pattern from "@/components/Pattern";

// Dynamically import AppTour with SSR disabled
const AppTour = dynamic(() => import('@/components/AppTour'), { ssr: false });

function HomePageContent() {
  const [runTour, setRunTour] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Ensure this component only renders on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && searchParams.get('tour') === 'true') {
      setRunTour(true);
    }
  }, [isClient, searchParams]);

  const handleTourComplete = () => {
    setRunTour(false);
    // Remove the query param from the URL without reloading the page
    router.replace('/', { scroll: false });
  };

  return (
    <>
      <main className="p-4">
        <Pattern />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <SecureLinkForm />
        </div>
      </main>
      {/* Only render the tour on the client to prevent hydration errors */}
      {isClient && <AppTour run={runTour} onTourComplete={handleTourComplete} />}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
