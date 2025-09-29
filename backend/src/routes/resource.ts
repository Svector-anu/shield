import { Router, Request, Response } from 'express';
import { policyStore } from '../index';

const router = Router();

router.get('/:policyId', (req: Request, res: Response) => {
  const { policyId } = req.params;
  // The policyId from the URL might be hex (0x...), but we store it as plain hex.
  const cleanPolicyId = policyId.startsWith('0x') ? policyId.substring(2) : policyId;

  const cid = policyStore.get(cleanPolicyId);

  if (cid) {
    res.json({ cid });
  } else {
    res.status(404).json({ error: 'Resource not found for this policy.' });
  }
});

export default router;
