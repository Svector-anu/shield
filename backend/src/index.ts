import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import policyRouter from './routes/policy';
import verifyRouter from './routes/verify';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Shield Backend API');
});

app.use('/api/policy', policyRouter);
app.use('/api/verify', verifyRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
