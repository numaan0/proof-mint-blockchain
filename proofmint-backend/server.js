require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

// --- NEW GLOBAL SETUP START ---
// 1. Define the Provider (The network gateway)
const RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 2. Define the Wallet and attach the Provider (Admin Wallet pays gas!)
const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider); 

console.log(`Platform Signer Address: ${wallet.address}`);
// --- NEW GLOBAL SETUP END ---


const CONTRACT_ADDRESS = "0x2D1AAEB733Fd4D9AAD8fa574E37258694c657ecd"; // ⚠️ Update this!

// --- MOCK DB ---
const PLATFORM_DB = {
  "0x6db7d10567790e4bb8d7e0b1589c1703f232921f": { earnings: 25000, score: 48, tenure: 12 },
  "0x4e76311021ad73f1feed763cd6a5102b22db03b9": { earnings: 25000, score: 48, tenure: 12 },
  "0x5df3de77889148ce5efd68ea131de3fadc0921ef": { earnings: 5000, score: 10, tenure: 12 },
  "0xf34f3e91273097bd980bdfd93ba352f44899e656": { earnings: 10000, score: 80, tenure: 12 }
};

// --- GASLESS SYNC ENDPOINT (Server Pays Gas) ---
app.post("/api/sync-profile", async (req, res) => {
  try {
    const { workerAddress } = req.body;
    console.log(`🚀 Processing Gasless Sync for: ${workerAddress}`);

    // 1. Lookup User in DB
    const user = PLATFORM_DB[workerAddress.toLowerCase()] || PLATFORM_DB[workerAddress];
    if (!user) return res.json({ success: false, error: "User not found" });

    // 2. Prepare Data & Sign
    const earningsWei = BigInt(user.earnings) * BigInt(10)**BigInt(18);
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "uint256"],
      [workerAddress, earningsWei, user.score, user.tenure]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    
    // 3. EXECUTE TRANSACTION (Backend pays gas!)
    const ABI = ["function syncPlatformDataGasless(address, uint256, uint256, uint256, bytes) external"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet); // Use connected global wallet!

    const tx = await contract.syncPlatformDataGasless(
        workerAddress,
        earningsWei,
        user.score,
        user.tenure,
        signature
    );
    
    await tx.wait(); 
    console.log("✅ Sync Confirmed on-chain!");

    res.json({ success: true, txHash: tx.hash, data: { earnings: earningsWei.toString(), score: user.score, tenure: user.tenure } });

  } catch (err) {
    console.error("Sync Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- GASLESS RELAY ENDPOINT ---
app.post("/api/relay-borrow", async (req, res) => {
  try {
    const { userAddress, signature, deadline } = req.body;
    console.log(`🚀 Relaying for: ${userAddress}`);
    
    // NOTE: adminWallet setup is now redundant here since 'wallet' is global and connected,
    // but using the existing code structure for safety.
    const ABI = ["function borrowGasless(address, uint256, bytes) external"];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet); // Use global wallet
    
    const tx = await contract.borrowGasless(userAddress, deadline, signature);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });

  } catch (err) { 
    console.error("Backend relay transaction failed:", err.message);
    
    let cleanMsg = err.message;
    const match = cleanMsg.match(/execution reverted: "([^"]+)"/);
    if (match) cleanMsg = match[1]; 
    else if (err.reason) cleanMsg = err.reason;
    else cleanMsg = cleanMsg.replace("Error: ", "").split("(")[0].trim();
    
    res.status(500).json({ success: false, error: cleanMsg });
  }
});

app.listen(5000, () => console.log("Server Running..."));