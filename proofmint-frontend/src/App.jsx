import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { ethers } from "ethers";
import About from "./pages/About";
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
    <Router>
      <div className="min-h-screen bg-[#f8fafc] font-sans text-gray-900 selection:bg-black selection:text-white relative overflow-x-hidden">
        
        {/* --- Glassmorphism Background Blobs --- */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-purple-200/40 rounded-full blur-[100px] opacity-70 mix-blend-multiply"></div>
          <div className="absolute top-[20%] -right-[10%] w-[50vw] h-[50vw] bg-emerald-200/40 rounded-full blur-[100px] opacity-70 mix-blend-multiply"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-blue-200/40 rounded-full blur-[100px] opacity-70 mix-blend-multiply"></div>
        </div>

        {/* --- Glass Navigation (Fixed) --- */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-12">
              <Link to="/" className="text-2xl font-bold tracking-tighter text-gray-900">ProofMint.</Link>
              <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
                <Link to="/" className="hover:text-black transition-colors">Home</Link>
                <Link to="/about" className="hover:text-black transition-colors">About</Link>
              </div>
            </div>
            
            {/* Wallet Connection */}
            <div>
              {!account ? (
                <button 
                  onClick={connect}
                  className="bg-gray-900/90 backdrop-blur-sm text-white px-6 py-2.5 rounded-full font-medium text-sm hover:bg-black transition-all shadow-lg hover:shadow-xl border border-transparent"
                >
                  Connect Wallet
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="hidden md:block text-sm font-medium text-gray-700 bg-white/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 shadow-sm">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block mr-2"></span>
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                  <button 
                    onClick={disconnect}
                    className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Spacer for fixed nav */}
        <div className="pt-24 pb-20">
          <Routes>
            <Route path="/" element={
              !account ? (
                <div className="animate-fade-in-up">
                  {/* Hero Section */}
                  <section className="flex flex-col items-center justify-center min-h-[75vh] text-center px-4 pt-10 pb-20">
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-white/40 bg-white/30 backdrop-blur-md text-sm font-medium text-gray-700 mb-10 shadow-sm">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-3 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                      Live on Flare Network
                    </div>
                    
                    <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter text-gray-900 leading-none mb-8 drop-shadow-sm">
                      Proof<span className="text-gray-400/80">Mint.</span>
                    </h1>
                    
                    <p className="text-2xl md:text-3xl text-gray-600 max-w-3xl font-light leading-relaxed mb-12">
                      The decentralized reputation layer for the gig economy. <br className="hidden md:block" />
                      <span className="text-gray-400">Verify earnings. Mint credit. Own your future.</span>
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
                      <button onClick={connect} className="group bg-gray-900/90 backdrop-blur-sm text-white px-10 py-5 rounded-full font-medium text-lg hover:bg-black transition-all shadow-2xl hover:shadow-xl flex items-center justify-center gap-3 border border-transparent">
                        Connect Wallet
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                      </button>
                      <Link to="/about" className="px-10 py-5 rounded-full font-medium text-lg border border-white/60 bg-white/40 backdrop-blur-md text-gray-700 hover:bg-white/60 hover:border-white transition-all flex items-center justify-center shadow-lg hover:shadow-xl">
                        How it Works
                      </Link>
                    </div>
                  </section>

                  {/* Features Section with Glass Cards */}
                  <section className="max-w-7xl mx-auto px-6 py-24">
                    <div className="grid md:grid-cols-3 gap-8">
                      {/* Card 1 */}
                      <div className="space-y-6 p-8 rounded-3xl bg-white/40 backdrop-blur-md border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center border border-white/50 shadow-inner">
                          <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-gray-900">Verifiable Proof</h3>
                        <p className="text-lg text-gray-600 leading-relaxed font-light">
                          Convert your off-chain work history into on-chain proofs. Immutable, trustless, and owned by you.
                        </p>
                      </div>
                      
                      {/* Card 2 */}
                      <div className="space-y-6 p-8 rounded-3xl bg-white/40 backdrop-blur-md border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center border border-white/50 shadow-inner">
                          <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-gray-900">Instant Liquidity</h3>
                        <p className="text-lg text-gray-600 leading-relaxed font-light">
                          Access undercollateralized loans based on your reputation score, not just your assets.
                        </p>
                      </div>
                      
                      {/* Card 3 */}
                      <div className="space-y-6 p-8 rounded-3xl bg-white/40 backdrop-blur-md border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center border border-white/50 shadow-inner">
                          <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-gray-900">Privacy First</h3>
                        <p className="text-lg text-gray-600 leading-relaxed font-light">
                          Zero-knowledge principles ensure you prove your creditworthiness without revealing sensitive data.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="max-w-7xl mx-auto px-4 mt-8">
                  <div className="flex justify-center gap-4 mb-8">
                    {roles.isWorker && (
                      <button onClick={() => setView("worker")} className={`px-6 py-2 rounded-full font-medium transition-all ${view === 'worker' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white/50 backdrop-blur-sm text-gray-500 border border-white/50 hover:bg-white hover:text-black'}`}>
                        Worker Portal
                      </button>
                    )}
                    {roles.isLender && (
                      <button onClick={() => setView("lender")} className={`px-6 py-2 rounded-full font-medium transition-all ${view === 'lender' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white/50 backdrop-blur-sm text-gray-500 border border-white/50 hover:bg-white hover:text-black'}`}>
                        Lender Portal
                      </button>
                    )}
                  </div>

                  {/* Glass Container for Panels */}
                  <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-6 md:p-10 min-h-[500px]">
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
                </div>
              )
            } />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}