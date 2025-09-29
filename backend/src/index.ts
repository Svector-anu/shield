import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { create } from 'ipfs-http-client';
import policyRouter from './routes/policy.js';
import verifyRouter from './routes/verify.js';
import resourceRouter from './routes/resource.js';
import db from './db.js'; // Import the persistent database

dotenv.config();

// --- IPFS Setup ---
const ipfs = create({ url: 'http://127.0.0.1:5001' });
export { ipfs, db };
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
