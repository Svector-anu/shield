# Shield: Decentralized Trustless File Sharing System

Shield is a decentralized application for sharing confidential files and messages with unparalleled security and privacy. It leverages blockchain technology, decentralized storage, and facial recognition to ensure that your private data is only ever seen by the intended recipient.

Unlike traditional platforms that rely on a central server, Shield is **trustless**. Access rules are enforced by an on-chain smart contract, meaning not even the Shield platform itself can access or censor your data. Links can be configured to expire or self-destruct after a certain number of failed verification attempts, giving you complete control.

## Key Features

- **Trustless On-Chain Security:** Access rules are immutably enforced by an Ethereum smart contract.
- **End-to-End Encryption:** Files are AES-encrypted on the sender's device before ever being uploaded.
- **Biometric Verification:** Grant access to a specific person by providing their photo. They verify their identity simply by using their device's camera.
- **Decentralized Storage:** Files are stored on a decentralized network, ensuring data permanence and censorship resistance.
- **Ephemeral & Revocable Access:** Set an expiration time and a maximum number of verification attempts for each secure link.

---

## How It Works

Shield's security model is designed to remove the need for a trusted intermediary. Here's a step-by-step look at the lifecycle of a secure link:

**1. Creating a Secure Link (Sender)**
   a. **Upload Content:** The sender selects a file or writes a message on the Shield frontend.
   b. **Provide Recipient's Face:** The sender uploads a clear picture of the intended recipient. The frontend uses `face-api.js` to create a mathematical representation (a "face descriptor") of the recipient's face.
   c. **Encrypt Data:** A new, random AES-256 secret key is generated in the browser. This key is used to encrypt the files/texts.
   d. **Upload to Decentralized Storage:** The encrypted data and the recipient's face descriptor are uploaded to decentralized storage via a decentralized network (Lit Protocol), returning two unique content identifiers (CIDs).
   e. **Create On-Chain Policy:** The sender submits a transaction to the Shield smart contract. This creates an `AccessPolicy` on the blockchain, containing the access rules (e.g., expiry time, max attempts) but **not** the secret key or CIDs. This policy is linked to a unique, randomly generated `policyId`.
   f. **Store Secret:** The secret key and storage CIDs are stored in a secure database (Firestore), linked to the on-chain `policyId`.
   g. **Share Link:** The sender receives a unique Shield link containing the `policyId` (e.g., `https://shield.app/r/<policyId>`) to share with the recipient.

**2. Accessing a Secure Link (Recipient)**
   a. **Open Link:** The recipient opens the Shield link in their browser.
   b. **Facial Verification:** The frontend prompts the recipient for camera access. They look into their camera, and the app captures a new face descriptor.
   c. **Verify Identity:** The frontend compares the new face descriptor with the original one fetched from decentralized storage.
   d. **Log Attempt & Check Policy:** If the faces match, the backend is notified. It logs a verification attempt with the smart contract. The smart contract checks if the policy has expired or if the maximum number of attempts has been reached.
   e. **Retrieve Secret Key:** If the smart contract confirms the policy is valid, the backend releases the secret decryption key to the recipient's frontend.
   f. **Decrypt and View:** The frontend downloads the encrypted content from decentralized storage and uses the secret key to decrypt it locally in the browser. The content is displayed to the recipient.

---

## Core Concepts

- **Smart Contract (The Unbiased Judge):** The Solidity smart contract on the Base Sepolia testnet acts as the ultimate arbiter of access. It's a simple, transparent, and immutable set of rules that cannot be tampered with. It only cares about *if* someone should have access, not *what* they are accessing.

- **Decentralized Storage (The Permanent Library):** We use content-addressed storage. This means the file's storage address is derived from its content. It's decentralized, censorship-resistant, and ensures your data remains available as long as at least one node is hosting it.

- **Lit Protocol (The Decentralized Worker):** Lit Protocol is used as a decentralized network of nodes to execute code. We use it to securely and reliably upload the encrypted content to decentralized storage without relying on our own centralized backend for the task.

- **Facial Verification (The Biometric Key):** Instead of passwords, we use a mathematical representation of the recipient's face as a key. This provides a high level of assurance that the person accessing the data is the intended recipient.

## Tech Stack

- **Smart Contract:** Solidity, Hardhat, Ethers.js
- **Backend:** Node.js, Firebase Functions (for secure key retrieval and smart contract interaction)
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Blockchain Interaction:** `wagmi` for wallet connection and contract calls.
- **Decentralized Storage:** Lit Protocol
- **Database:** Firestore (for linking on-chain policies to off-chain secrets)
- **Biometrics:** `face-api.js`

---

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js:** [Download here](https://nodejs.org/)
2.  **Decentralized Storage Node:** Required for decentralized file storage. You can use a variety of providers.
3.  **MetaMask:** A browser extension wallet for interacting with the blockchain. [Download here](https://metamask.io/)

## Installation & Setup

Follow these steps to set up the project locally.

### 1. Clone the Repository

```bash
git clone <https://github.com/Babs0022/SHIELD.git>
cd SHIELD
```

### 2. Install Dependencies

You need to install dependencies for all three parts of the application.

- **Root & Backend:**
  ```bash
  npm install
  cd backend
  npm install
  ```

- **Smart Contract:**
  ```bash
  cd ../smart-contract
  npm install
  ```

- **Frontend:**
  ```bash
  cd ../frontend
  npm install
  ```

### 3. Configure Environment Variables

You need to create `.env` files for both the smart contract and the backend.

- **Smart Contract (`/smart-contract/.env`):**
  Create this file and add the following, filling in your details. This wallet will be used to deploy the contract.
  ```
  BASE_SEPOLIA_RPC_URL=https://your-base-sepolia-rpc-url
  PRIVATE_KEY=your-wallet-private-key
  ```

- **Backend (`/backend/.env`):**
  Create this file and add the following. You can use the same RPC URL and private key.
  ```
  PORT=3001
  BASE_SEPOLIA_RPC_URL=https://your-base-sepolia-rpc-url
  PRIVATE_KEY=your-wallet-private-key
  SHIELD_CONTRACT_ADDRESS=the-address-of-your-deployed-contract
  ```

---

## Running the Application

### 1. Start Decentralized Storage

Launch your decentralized storage application and make sure your node status is "Running".

### 2. Deploy the Smart Contract

If you need to deploy a new version of the contract:

```bash
cd smart-contract
npx hardhat run scripts/deploy.ts --network baseSepolia
```

After deployment, copy the new contract address into the `SHIELD_CONTRACT_ADDRESS` variable in your `/backend/.env` file.

### 3. Start the Backend

Open a new terminal.

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:3001`.

### 4. Start the Frontend

Open a third terminal.

```bash
cd frontend
npm run dev
```

The frontend application will start on `http://localhost:3000`.

### 5. Use the Application

Open your browser to `http://localhost:3000` to begin sharing files and messages securely.

## Project Structure

The project is a monorepo containing three distinct packages:

- **/smart-contract:** Contains the Solidity smart contract and deployment scripts.
- **/backend:** The Node.js server that handles API requests, file uploads to decentralized storage, and blockchain communication.
- **/frontend:** The Next.js user interface where users can create and access secure links.
