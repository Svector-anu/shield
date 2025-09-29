import './globals.css';
import StyledComponentsRegistry from '../lib/StyledComponentsRegistry';
import Pattern from '../components/Pattern';

export const metadata = {
  title: 'Shield - Secure Sharing',
  description: 'Decentralized and secure file and message sharing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex items-center justify-center min-h-screen">
        <StyledComponentsRegistry>
          <Pattern />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}
