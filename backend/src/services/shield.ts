import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Helper to get the correct directory path in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the ABI using the file system for reliability
const abiPath = path.resolve(__dirname, '../abi/Shield.json');
const abiFile = fs.readFileSync(abiPath, 'utf8');
const shieldAbi = JSON.parse(abiFile);

console.log('Attempting to use private key:', process.env.PRIVATE_KEY);

const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || '');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);

const shieldContract = new ethers.Contract(
  process.env.SHIELD_CONTRACT_ADDRESS || '',
  shieldAbi.abi, // Access the abi property from the parsed JSON
  wallet
);

export default shieldContract;
