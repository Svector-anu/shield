require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const ShieldABI = require('./Shield.json');

// --- Express and Middleware Setup ---
const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'db.json');

// --- Database Helper Functions ---
const readDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}));
  }
  const data = fs.readFileSync(DB_PATH);
  return JSON.parse(data);
};

const writeDb = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// --- Ethers Setup ---
const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const pinataJwt = process.env.PINATA_JWT;

if (!rpcUrl || !privateKey || !contractAddress || !pinataJwt) {
  console.error("FATAL: Missing required environment variables.");
  process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, ShieldABI.abi, wallet);

console.log(`Backend wallet address: ${wallet.address}`);

// --- Helper Functions ---
const pinToIPFS = async (data, filename) => {
  const formData = new FormData();
  formData.append('file', data, filename);
  const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
    headers: {
      'Authorization': `Bearer ${pinataJwt}`,
    },
  });
  return response.data.IpfsHash;
};

// --- API Endpoints ---
app.post('/api/createLink', upload.fields([{ name: 'content' }, { name: 'recipientImage' }]), async (req, res) => {
  try {
    const { expiry, maxAttempts, isText, creatorId, mimeType } = req.body;
    const contentFile = req.files.content ? req.files.content[0] : null;
    const recipientImageFile = req.files.recipientImage[0];

    if ((!contentFile && !req.body.content) || !recipientImageFile) {
        return res.status(400).json({ error: "Missing content or recipient image." });
    }

    const secretKey = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);

    const contentBuffer = contentFile ? contentFile.buffer : Buffer.from(req.body.content, 'utf-8');
    const encryptedContent = CryptoJS.AES.encrypt(contentBuffer.toString('base64'), secretKey).toString();
    const contentCid = await pinToIPFS(Buffer.from(encryptedContent), `content-${uuidv4()}`);

    const encryptedRecipientImage = CryptoJS.AES.encrypt(recipientImageFile.buffer.toString('base64'), secretKey).toString();
    const faceCid = await pinToIPFS(Buffer.from(encryptedRecipientImage), `image-${uuidv4()}`);

    let policyId;
    let policyExists = true;
    while (policyExists) {
      policyId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const existingPolicy = await contract.policies(policyId);
      if (existingPolicy.sender === ethers.constants.AddressZero) {
        policyExists = false;
      }
    }
    const expiryTimestamp = Math.floor(Date.now() / 1000) + parseInt(expiry, 10);
    
    const tx = await contract.createPolicy(policyId, expiryTimestamp, parseInt(maxAttempts, 10), { gasLimit: 150000 });
    await tx.wait();

    const db = readDb();
    db[policyId] = {
      creatorId,
      resourceCid: contentCid,
      faceCid,
      secretKey,
      mimeType: contentFile ? contentFile.mimetype : 'text/plain',
      isText: isText === 'true',
      expiry: expiryTimestamp,
      maxAttempts: parseInt(maxAttempts, 10),
      attempts: 0,
      valid: true,
    };
    writeDb(db);

    const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/r/${policyId}`;
    res.status(200).json({ success: true, link });

  } catch (error) {
    console.error("Error in /api/createLink:", error);
    res.status(500).json({ error: "Failed to create link.", details: error.message });
  }
});

app.get('/api/getPolicy/:policyId', (req, res) => {
    const { policyId } = req.params;
    const db = readDb();
    const policy = db[policyId];
    if (policy) {
        res.status(200).json(policy);
    } else {
        res.status(404).json({ error: "Policy not found." });
    }
});

app.post('/api/logAttempt', async (req, res) => {
    const { policyId, success } = req.body;
    if (!policyId || typeof success !== 'boolean') {
        return res.status(400).json({ error: "Invalid request." });
    }
    try {
        const tx = await contract.logAttempt(policyId, success);
        await tx.wait();
        // You might also want to update the attempt count in your db.json here
        res.status(200).json({ success: true, txHash: tx.hash });
    } catch (error) {
        res.status(500).json({ error: "Failed to log attempt.", details: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`Gasless backend server running on http://localhost:${PORT}`);
});