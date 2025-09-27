import { Router, Request, Response } from 'express';
import shieldContract from '../services/shield';

const router = Router();

router.post('/:policyId', async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const { success } = req.body; // This will come from the face verification service

    // First, check if the policy is valid
    const isValid = await shieldContract.isPolicyValid(policyId);
    if (!isValid) {
      return res.status(400).json({ error: 'Policy is not valid' });
    }

    // Log the verification attempt
    const tx = await shieldContract.logAttempt(policyId, success);
    await tx.wait();

    if (success) {
      // In a real application, this is where you would grant access to the resource
      res.json({ success: true, message: 'Verification successful' });
    } else {
      res.status(401).json({ success: false, message: 'Verification failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process verification' });
  }
});

export default router;
