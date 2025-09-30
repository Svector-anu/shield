'use client';

import Joyride, { Step, CallBackProps } from 'react-joyride';

interface AppTourProps {
  run: boolean;
  onTourComplete: () => void;
}

const tourSteps: Step[] = [
  {
    target: '.connect-wallet-button-selector', // We will need to add this class to the ConnectButton
    content: "Let's start by connecting your crypto wallet. Shield uses a smart contract to manage access, and your wallet is your key.",
    disableBeacon: true,
  },
  {
    target: '.secure-link-form-selector', // And this one to the form
    content: 'This is where you create your secure link. First, choose whether to share a file or text.',
  },
  {
    target: '.recipient-face-selector', // To the recipient face input
    content: "This is the core of Shield's security. Upload a clear photo of the person allowed to open the link.",
  },
  {
    target: '.access-rules-selector', // To the expiry and attempts inputs
    content: 'Next, set the rules for your link: how long it will be active and how many times the recipient can try to verify.',
  },
  {
    target: '.generate-link-button-selector', // To the generate button
    content: 'Once you\'re ready, click here. This will encrypt your data and create the secure policy on the blockchain.',
  },
];

export default function AppTour({ run, onTourComplete }: AppTourProps) {
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = ['finished', 'skipped'];

    if (finishedStatuses.includes(status)) {
      onTourComplete();
    }
  };

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#1a202c',
          backgroundColor: '#e2e8f0',
          overlayColor: 'rgba(0, 0, 0, 0.8)',
          primaryColor: '#00ff00',
          textColor: '#1a202c',
          zIndex: 1000,
        },
      }}
    />
  );
}
