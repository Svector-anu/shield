import { ethers } from 'ethers';
import dotenv from 'dotenv';
import ShieldAbi from '../abi/Shield.json';

dotenv.config();

console.log('Attempting to use private key:', process.env.PRIVATE_KEY); // Debugging line

const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || '');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);

const shieldContract = new ethers.Contract(
  process.env.SHIELD_CONTRACT_ADDRESS || '',
  ShieldAbi.abi,
  wallet
);

export default shieldContract;
