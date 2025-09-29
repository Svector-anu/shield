import { Router, Request, Response } from 'express';
import { db } from '../index.js';
import shieldContract from '../services/shield.js';

const router = Router();

router.get('/:policyId', async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const cleanPolicyId = policyId.startsWith('0x') ? policyId.substring(2) : policyId;

    const policyData = db.data.policies[cleanPolicyId];

    if (policyData && policyData.faceCid) {
      // Check the contract for the current validity of the policy
      const isValid = await shieldContract.isPolicyValid(policyId);

      res.json({ 
        faceCid: policyData.faceCid,
        isValid: isValid 
      });
    } else {
      res.status(404).json({ error: 'Policy not found or face CID missing.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve policy status.' });
  }
});

export default router;

