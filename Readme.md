
# 🛡️ ProofMint: Decentralized Credit for the Gig Economy

> **Bridging Web2 Reputation to Web3 Liquidity using Flare FTSO & FDC.**

**ProofMint** is an on-chain lending protocol designed specifically for the gig economy (Swiggy, Zomato, Uber drivers). 
It allows workers to verify their off-chain earnings on the blockchain and access instant, under-collateralized loans—without needing a bank account or even gas fees.

-----

## 😤 The Problem

Gig workers generate massive amounts of income data, but they remain **credit invisible**.

  * **No Paper Trail:** Banks don't trust app screenshots or CSV exports.
  * **High Interest:** They resort to predatory loan sharks (30%+ interest).
  * **Crypto Friction:** They don't have ETH/FLR for gas fees to use DeFi.

## 💡 The Solution

ProofMint allows workers to "Sync" their platform history (Earnings, Tenure, Review Score) to the **Flare Blockchain**.

  * **Trustless Verification:** Uses **Flare Data Connector (FDC)** patterns to attest to the validity of the data.
  * **Fair Pricing:** Uses **Flare FTSO v2** to calculate loan limits based on real-time FLR/USD rates.
  * **Zero Friction:** Implements **Gasless Transactions (Account Abstraction)** so workers can borrow with an empty wallet.

-----

## 🚀 Key Features

### 👷 For Workers (Borrowers)

  * **One-Click Sync:** Verify income from Web2 platforms without revealing login credentials.
  * **Gasless Borrowing:** Get a loan even if you have **0 FLR** in your wallet (Server pays gas via Relayer).
  * **Reputation-Based:** Higher review scores & tenure = Higher loan eligibility.
  * **Credit Building:** Successful repayments build an immutable on-chain credit history.

### 🏦 For Lenders (Investors)

  * **Liquid Liquidity:** Deposit FLR to mint **Pool Shares**.
  * **Real Yield:** Earn 5% APY generated from real-world borrower repayments.
  * **Transparency:** View protocol utilization and global loan history in real-time.

-----

## ⚡ Flare Technology Stack

We leveraged the Flare stack to build a truly decentralized bridge:

1.  **FTSO v2 (Flare Time Series Oracle):**

      * *Usage:* Used inside the Smart Contract to fetch live `FLR/USD` prices.
      * *Why:* Ensures that a worker earning $50 receives exactly the right amount of FLR, regardless of market volatility.

2.  **FDC Pattern (Flare Data Connector):**

      * *Usage:* We implemented an FDC-compliant Attestation Provider. Our backend verifies the off-chain API data (Swiggy/Zomato), cryptographically signs it, and the Smart Contract verifies this signature (`ecrecover`) before updating the state.
      * *Why:* Bridges real-world identity to the blockchain trustlessly.

3.  **Smart Accounts / Account Abstraction:**

      * *Usage:* Implemented a `borrowGasless` Relayer pattern.
      * *Why:* Solves the "Cold Start" problem. Workers can interact with the blockchain without buying crypto first.

-----

## 🏗️ Architecture

```mermaid
graph TD
    User[Gig Worker] -->|1. Sync Profile| Backend[Attestation Node]
    Backend -->|2. Verify & Sign Data| User
    User -->|3. Submit Proof (Gasless)| Relayer[Relayer Service]
    Relayer -->|4. Submit Tx| Contract[GigLendingPool]
    FTSO[Flare FTSO v2] -->|5. Get FLR Price| Contract
    Contract -->|6. Verify & Disburse| User
```

-----

## 🛠️ Tech Stack

  * **Blockchain:** Flare Coston2 Testnet
  * **Smart Contracts:** Solidity (v0.8.20)
  * **Frontend:** React, Vite, Tailwind CSS, Ethers.js v6
  * **Backend:** Node.js, Express (Acting as Oracle/Relayer)
  * **Tools:** Remix IDE, MetaMask

-----

## ⚙️ Installation & Setup

Follow these steps to run the project locally.

### 1\. Clone the Repository

```bash
git clone https://github.com/your-username/proofmint.git
cd proofmint
```

### 2\. Backend Setup (The Oracle & Relayer)

```bash
cd server
npm install
```

Create a `.env` file in the `server` folder:

```env
# The Private Key of the Wallet you used to deploy the contract
ADMIN_PRIVATE_KEY=your_private_key_here
```

Start the server:

```bash
node index.js
```

### 3\. Frontend Setup (The User App)

Open a new terminal.

```bash
cd client
npm install
npm run dev
```

### 4\. Smart Contract (If deploying fresh)

1.  Open `GigLendingPool.sol` in **Remix IDE**.
2.  Compile with version `0.8.20`.
3.  Deploy to **Flare Coston2** (Chain ID: 114).
      * *Constructor Argument:* Pass the Public Address of your `ADMIN_PRIVATE_KEY` wallet.
4.  **Important Post-Deploy Steps:**
      * Send **10 C2FLR** to the contract address (to fund the liquidity pool).
      * Call `setRole(YOUR_WALLET, "lender")`.
      * Call `setRole(YOUR_WALLET, "borrower")`.

-----

## 📜 Contract Details

**Network:** Flare Coston2 Testnet
**Contract Address:** `0xYOUR_CONTRACT_ADDRESS_HERE` *(Update this\!)*

| Function | Description |
| :--- | :--- |
| `syncPlatformData` | Verifies FDC attestation and updates credit score. |
| `borrow` | Standard borrowing (User pays gas). |
| `borrowGasless` | Meta-transaction borrowing (Relayer pays gas). |
| `repay` | Repays loan + 5% interest. |
| `deposit` | Mint shares to provide liquidity. |
| `withdraw` | Burn shares to exit position. |

-----

## 👥 Team

  * **Your Name** - Full Stack Blockchain Developer

-----

### 🏆 Hackathon Notes for Judges

  * **Test Wallet:** To test the "Success" path, use a wallet address that is whitelisted in `server/index.js`.
  * **Gasless Demo:** Try the toggle in the Worker Panel to see the transaction happen without the user paying gas\!