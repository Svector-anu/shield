import { Router, Request, Response } from 'express';
import shieldContract from '../services/shield';

const router = Router();

router.post('/:policyId', async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const { success } = req.body;

    // The logAttempt function on the smart contract will handle all validity checks.
    // This prevents race conditions and keeps the contract as the single source of truth.
    const tx = await shieldContract.logAttempt(policyId, success);
    await tx.wait();

    // If the transaction was successful, it means the log was recorded.
    res.json({ success: true, message: 'Verification attempt logged.' });

  } catch (error: any) {
    console.error(error);
    // The error from ethers likely contains a specific revert reason from the smart contract.
    const reason = error.reason || 'Failed to process verification';
    res.status(500).json({ error: reason });
  }
});

export default router;
