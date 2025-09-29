import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { create } from 'ipfs-http-client';
import policyRouter from './routes/policy';
import verifyRouter from './routes/verify';
import resourceRouter from './routes/resource';

dotenv.config();

// --- IPFS and Data Store Setup ---
// Connects to the local IPFS node's API server (default port for IPFS Desktop)
const ipfs = create({ url: 'http://127.0.0.1:5001' });

// In-memory store for PolicyID -> IPFS CID mapping. 
// NOTE: This is for demonstration only. In a real app, you'd use a persistent database.
export const policyStore = new Map<string, string>();
export { ipfs };
// --------------------------------

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Shield Backend API');
});

app.use('/api/policy', policyRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/resource', resourceRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
