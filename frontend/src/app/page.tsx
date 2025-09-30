'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SecureLinkForm from "@/components/SecureLinkForm";
import Pattern from "@/components/Pattern";
import AppTour from '@/components/AppTour';

function HomePageContent() {
  const [runTour, setRunTour] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('tour') === 'true') {
      setRunTour(true);
    }
  }, [searchParams]);

  const handleTourComplete = () => {
    setRunTour(false);
    // Remove the query param from the URL
    router.replace('/', undefined);
  };

  return (
    <>
      <main className="p-4">
        <Pattern />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <SecureLinkForm />
        </div>
      </main>
      <AppTour run={runTour} onTourComplete={handleTourComplete} />
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
