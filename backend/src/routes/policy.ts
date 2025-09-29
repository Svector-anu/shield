import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import multer from 'multer';
import { ipfs, db } from '../index.js';
import shieldContract from '../services/shield.js';

const router = Router();

// Configure multer for in-memory file storage for the encrypted resource
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('resource'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'An encrypted resource file is required.' });
    }

    const { expiry, maxAttempts, secretKey, recipientFaceDescriptor } = req.body;

    if (!secretKey || !recipientFaceDescriptor) {
      return res.status(400).json({ error: 'A secret key and recipient face descriptor are required.' });
    }

    // Add the encrypted resource and the face descriptor to IPFS in parallel
    const [resourceResult, faceResult] = await Promise.all([
      ipfs.add(req.file.buffer),
      ipfs.add(Buffer.from(recipientFaceDescriptor)),
    ]);

    const resourceCid = resourceResult.cid.toString();
    const faceCid = faceResult.cid.toString(); // This is now the CID of the descriptor string

    const policyId = ethers.randomBytes(32);
    const tx = await shieldContract.createPolicy(policyId, expiry, maxAttempts);
    await tx.wait();

    const policyIdHex = ethers.hexlify(policyId);
    const cleanPolicyId = policyIdHex.startsWith('0x') ? policyIdHex.substring(2) : policyIdHex;
    
    // Write to the persistent database
    db.data.policies[cleanPolicyId] = { resourceCid, faceCid, secretKey };
    await db.write();

    res.json({ policyId: policyIdHex });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

export default router;

