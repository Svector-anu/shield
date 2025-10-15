
import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Make sure to set these environment variables in your .env.local file
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();

    if (!message || !signature) {
      return NextResponse.json({ error: 'Missing message or signature' }, { status: 400 });
    }

    const siweMessage = new SiweMessage(message);
    
    // This will throw an error if the signature is invalid
    const { data: fields } = await siweMessage.verify({ signature });

    // The user's wallet address is the address from the verified message
    const walletAddress = fields.address;

    // Generate a custom Firebase token for the user's wallet address
    // This token will be used on the client-side to sign in to Firebase
    const firebaseToken = await admin.auth().createCustomToken(walletAddress);

    return NextResponse.json({ token: firebaseToken });

  } catch (error) {
    console.error('SIWE verification failed:', error);
    // Check if the error is a SIWE error and return a specific message
    if (error instanceof Error && error.message.includes('Invalid signature')) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
