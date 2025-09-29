import { initializeApp } from 'firebase-admin/app';
import { uploadToIpfs } from './functions.js';

// Initialize the Firebase Admin SDK
initializeApp();

// Export the function for deployment
export { uploadToIpfs };
