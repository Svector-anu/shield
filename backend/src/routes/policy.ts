import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import multer from 'multer';
import { ipfs, policyStore } from '../index';
import shieldContract from '../services/shield';

const router = Router();

// Configure multer for in-memory file storage
const upload = multer({ storage: multer.memoryStorage() });

// Define the fields for multer to process
const uploadFields = upload.fields([
  { name: 'resource', maxCount: 1 },
  { name: 'recipientFace', maxCount: 1 },
]);

router.post('/', uploadFields, async (req: Request, res: Response) => {
  try {
    // Check if files were uploaded
    if (!req.files || !('resource' in req.files) || !('recipientFace' in req.files)) {
      return res.status(400).json({ error: 'Both a resource file and a recipient face image are required.' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Add both files to IPFS in parallel for efficiency
    const [resourceResult, faceResult] = await Promise.all([
      ipfs.add(files.resource[0].buffer),
      ipfs.add(files.recipientFace[0].buffer),
    ]);

    const resourceCid = resourceResult.cid.toString();
    const faceCid = faceResult.cid.toString();

    // Get policy details from the request body
    const { expiry, maxAttempts } = req.body;

    // Create the policy on the blockchain
    const policyId = ethers.randomBytes(32);
    const tx = await shieldContract.createPolicy(policyId, expiry, maxAttempts);
    await tx.wait();

    const policyIdHex = ethers.hexlify(policyId);
    
    // Store both CIDs against the policyId
    policyStore.set(policyIdHex.substring(2), { resourceCid, faceCid });

    // Return the policyId to the frontend
    res.json({ policyId: policyIdHex });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

export default router;
