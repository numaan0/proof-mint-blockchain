import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import Header from "./components/Header";
// Note: Ensuring correct component imports based on your file structure
// import WorkerPanel from "./components/WorkerPanel"; 
// import LenderPanel from "./components/LenderPanel";
import LenderPanel from "./components/LenderPanel";
import WorkerPanel from "./components/WorkPanel";
// --- CONFIGURATION ---
// ⚠️ REPLACE THIS WITH YOUR NEW CONTRACT ADDRESS IF IT CHANGES
const POOL_ADDRESS = "0x2D1AAEB733Fd4D9AAD8fa574E37258694c657ecd"; 
const BACKEND_URL = "https://proofmintapi.onrender.com";

// --- FINAL ABI ---
const POOL_ABI = [
  // Roles
  "function isBorrower(address) external view returns (bool)",
  "function isLender(address) external view returns (bool)",
  
  // Actions
  "function borrow() external",
  "function borrowGasless(address, uint256, bytes) external",
  "function repay() external payable",
  "function deposit() external payable",
  "function withdraw(uint256) external",
  
  // Syncing
  "function syncPlatformData(uint256, uint256, uint256, bytes) external",
  "function syncPlatformDataGasless(address, uint256, uint256, uint256, bytes) external", // <--- NEW

  // Views
  "function shares(address) external view returns (uint256)",
  "function totalShares() external view returns (uint256)",
  "function nonces(address) external view returns (uint256)",
  // [earnings, score, tenure, verified, hasLoan, loanAmount]
  "function profiles(address) external view returns (uint256, uint256, uint256, bool, bool, uint256)",
  // [price, eligibility, cap]
  "function getCreditDetails(address) external view returns (uint256, uint256, uint256)", // <--- NEW

  // Events
  "event LoanTaken(address indexed borrower, uint256 amount)",
  "event DepositReceived(address indexed lender, uint256 amount, uint256 shares)",
  "event Withdrawal(address indexed lender, uint256 amountFLR, uint256 sharesBurned)",
  "event LoanRepaid(address indexed borrower, uint256 amountPaid, uint256 interestPaid)"
];

export default function App() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [view, setView] = useState("landing");
  const [roles, setRoles] = useState({ isWorker: false, isLender: false });

  const checkRoles = async (userAddress, userSigner) => {
    try {
      const contract = new ethers.Contract(POOL_ADDRESS, POOL_ABI, userSigner);
      const _isWorker = await contract.isBorrower(userAddress);
      const _isLender = await contract.isLender(userAddress);

      setRoles({ isWorker: _isWorker, isLender: _isLender });

      if (_isWorker) setView("worker");
      else if (_isLender) setView("lender");
      else setView("unauthorized");
    } catch (err) { console.error("Role check failed", err); }
  };

  // --- 1. CONNECT FUNCTION (SAVES TO LOCAL STORAGE) ---
  const connect = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    try {
        await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }]
        });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const _signer = await provider.getSigner();
        const _account = await _signer.getAddress();
        
        // FIX 1: Save account address to local storage
        localStorage.setItem('walletConnected', _account); 
        
        setSigner(_signer);
        setAccount(_account);
        checkRoles(_account, _signer);
    } catch (err) { console.error(err); }
  };

  const disconnect = () => {
    // FIX 2: Clear local storage on disconnect
    localStorage.removeItem('walletConnected');
    
    setAccount(null);
    setSigner(null);
    setView("landing");
    setRoles({ isWorker: false, isLender: false });
  };

  // --- 2. RESTORE CONNECTION ON RELOAD ---
  useEffect(() => {
    const restoreConnection = async () => {
        const savedAccount = localStorage.getItem('walletConnected');
        
        if (savedAccount && window.ethereum) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const accounts = await provider.listAccounts();
                
                // Only restore if MetaMask is currently unlocked and connected to the saved address
                if (accounts.length > 0 && accounts[0].address.toLowerCase() === savedAccount.toLowerCase()) {
                    const _signer = await provider.getSigner();
                    setSigner(_signer);
                    setAccount(savedAccount);
                    checkRoles(savedAccount, _signer);
                } else {
                    // If the stored address isn't the current MetaMask account, clear storage
                    localStorage.removeItem('walletConnected');
                }
            } catch (err) {
                console.error("Failed to restore connection:", err);
                localStorage.removeItem('walletConnected');
            }
        }
    };
    restoreConnection();
  }, []); // Run only once on component mount

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Header account={account} connect={connect} disconnect={disconnect} />

      {!account ? (
        <div className="text-center mt-20 px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ProofMint</h1>
          <p className="text-gray-500 mb-8">Decentralized Credit for Gig Workers on Flare.</p>
          <button onClick={connect} className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl">
            Connect Wallet
          </button>
        </div>
      ) : (
        <div>
          <div className="flex justify-center gap-4 mt-8 mb-4">
            {roles.isWorker && (
              <button onClick={() => setView("worker")} className={`px-6 py-2 rounded-full font-medium transition-all ${view === 'worker' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border'}`}>
                Worker Portal
              </button>
            )}
            {roles.isLender && (
              <button onClick={() => setView("lender")} className={`px-6 py-2 rounded-full font-medium transition-all ${view === 'lender' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border'}`}>
                Lender Portal
              </button>
            )}
          </div>

          {view === "worker" && roles.isWorker && (
            <WorkerPanel account={account} signer={signer} poolAddress={POOL_ADDRESS} poolAbi={POOL_ABI} backendUrl={BACKEND_URL} />
          )}

          {view === "lender" && roles.isLender && (
            <LenderPanel signer={signer} poolAddress={POOL_ADDRESS} poolAbi={POOL_ABI} />
          )}

          {view === "unauthorized" && (
             <div className="text-center mt-20 text-gray-500"><h3 className="text-xl font-bold">Access Denied</h3><p>Wallet not registered.</p></div>
          )}
        </div>
      )}
    </div>
  );
}