# Shield: Decentralized Secure File Sharing

Shield is a trustless, decentralized application for sharing confidential files and messages with security and peace of mind. It leverages blockchain technology and facial recognition to ensure that your private data is only ever seen by the intended recipient.

Unlike traditional platforms, Shield uses a smart contract to enforce access rules, meaning not even the platform itself can access your data. Links can be configured to expire or self-destruct after a certain number of failed verification attempts.

## Key Features

- **Trustless Security:** Access rules are enforced by an on-chain smart contract, not a centralized server.
- **End-to-End Encryption:** Files are encrypted on the sender's device and decrypted on the recipient's device (feature in development).
- **Facial Verification:** Grant access by providing a photo of the recipient. They verify their identity using their device's camera.
- **Decentralized Storage:** Files are stored on the InterPlanetary File System (IPFS), not on a central server.
- **Ephemeral Links:** Set an expiration time and a maximum number of verification attempts for each secure link.

## Tech Stack

- **Smart Contract:** Solidity, Hardhat
- **Backend:** Node.js, Express, Ethers.js, IPFS Client
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS

---

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js:** [Download here](https://nodejs.org/)
2.  **IPFS Desktop:** Required for decentralized file storage. [Download here](https://ipfs.io/desktop/)
3.  **MetaMask:** A browser extension wallet for interacting with the blockchain. [Download here](https://metamask.io/)

## Installation & Setup

Follow these steps to set up the project locally.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
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

### 1. Start IPFS

Launch the IPFS Desktop application and make sure your node status is "Running".

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
- **/backend:** The Node.js server that handles API requests, file uploads to IPFS, and blockchain communication.
- **/frontend:** The Next.js user interface where users can create and access secure links.
