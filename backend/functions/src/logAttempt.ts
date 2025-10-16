import * as functions from "firebase-functions";
import * as express from "express";
import * as cors from "cors";
import { ethers } from "ethers";
import ShieldABI from "./Shield.json"; // Assuming ABI is copied here

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY || "";
if (!privateKey) {
  throw new Error("SERVER_WALLET_PRIVATE_KEY is not set in environment variables.");
}
const wallet = new ethers.Wallet(privateKey, provider);

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
if (!contractAddress) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
}
const contract = new ethers.Contract(contractAddress, ShieldABI.abi, wallet);

app.post("/", async (req, res) => {
  const { policyId, success } = req.body;

  if (!policyId || typeof success !== 'boolean') {
    return res.status(400).json({ error: "Missing or invalid policyId or success status." });
  }

  try {
    functions.logger.info(`Logging attempt for policyId: ${policyId}, success: ${success}`);
    
    const tx = await contract.logAttempt(policyId, success);
    await tx.wait(); // Wait for the transaction to be mined

    functions.logger.info(`Transaction successful: ${tx.hash}`);
    return res.status(200).json({ success: true, txHash: tx.hash });
  } catch (error: any) {
    functions.logger.error(`Error logging attempt for policyId: ${policyId}`, error);
    return res.status(500).json({ error: "Failed to log attempt on-chain.", details: error.message });
  }
});

export const logAttempt = functions.https.onRequest(app);
