import { Router, Request, Response } from 'express';
import shieldContract from '../services/shield.js';
import { db } from '../index.js';

const router = Router();

router.post('/:policyId', async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const { success } = req.body;

    // Log the attempt on the smart contract. This is the source of truth.
    const tx = await shieldContract.logAttempt(policyId, success);
    await tx.wait(); // Wait for the transaction to be mined

    // If the attempt was not successful, or the transaction reverted, we stop here.
    if (!success) {
      return res.json({ success: false, message: 'Verification attempt logged as failed.' });
    }

    // If the attempt was successful and the transaction went through,
    // retrieve the sensitive data and return it.
    const cleanPolicyId = policyId.startsWith('0x') ? policyId.substring(2) : policyId;
    const policyData = db.data.policies[cleanPolicyId];

    if (policyData && policyData.resourceCid && policyData.secretKey) {
      res.json({
        success: true,
        message: 'Verification successful!',
        resourceCid: policyData.resourceCid,
        secretKey: policyData.secretKey,
      });
    } else {
      // This case would indicate a server-side issue (e.g., data store inconsistency)
      res.status(404).json({ error: 'Policy data not found after successful verification.' });
    }

  } catch (error: any) {
    console.error(error);
    const reason = error.reason || 'Failed to process verification';
    res.status(500).json({ error: reason });
  }
});

export default router;

