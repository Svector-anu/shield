import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import multer from 'multer';
import { ipfs, policyStore } from '../index';
import shieldContract from '../services/shield';

const router = Router();

// Configure multer for in-memory file storage
const upload = multer({ storage: multer.memoryStorage() });

// The route now uses multer middleware to handle a single file upload from a field named 'resource'
router.post('/', upload.single('resource'), async (req: Request, res: Response) => {
  try {
    // 1. Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Resource file is required.' });
    }

    // 2. Add the file to IPFS
    const fileResult = await ipfs.add(req.file.buffer);
    const fileCid = fileResult.cid.toString();

    // 3. Get policy details from the request body
    const { expiry, maxAttempts } = req.body;

    // 4. Create the policy on the blockchain
    const policyId = ethers.randomBytes(32);
    const tx = await shieldContract.createPolicy(policyId, expiry, maxAttempts);
    await tx.wait();

    // 5. Store the mapping of policyId -> IPFS CID
    const policyIdHex = ethers.hexlify(policyId);
    // Store the hex string without the '0x' prefix to match the URL parameter format
    policyStore.set(policyIdHex.substring(2), fileCid);

    // 6. Return the policyId to the frontend
    res.json({ policyId: policyIdHex });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

export default router;
