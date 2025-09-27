import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import shieldContract from '../services/shield';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { expiry, maxAttempts } = req.body;
    const policyId = ethers.randomBytes(32);

    const tx = await shieldContract.createPolicy(policyId, expiry, maxAttempts);
    await tx.wait();

    res.json({ policyId: ethers.hexlify(policyId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

export default router;
