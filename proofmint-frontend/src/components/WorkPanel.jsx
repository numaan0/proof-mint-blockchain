import React, { useState, useEffect, useCallback } from "react"; 
import { ethers } from "ethers";
import { Loader2, RefreshCw, Zap, TrendingUp, ShieldCheck, ToggleRight, ToggleLeft } from "lucide-react"; 
import StatusCard from "./StatusCard";

export default function WorkerPanel({ account, signer, poolAddress, poolAbi, backendUrl }) {
  const [profile, setProfile] = useState(null);
  const [marketData, setMarketData] = useState(null); 
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isGasless, setIsGasless] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false); 

  // --- FETCH ON-CHAIN DATA (Memoized for useEffect) ---
  const fetchOnChainProfile = useCallback(async () => {
    if(!signer || !account) return;
    try {
      const pool = new ethers.Contract(poolAddress, poolAbi, signer);
      const p = await pool.profiles(account);
      
      if (p[3] === true) { 
        setProfile({
          earnings: ethers.formatEther(p[0]), 
          score: Number(p[1]), 
          tenure: Number(p[2]), 
          hasLoan: p[4],
          loanAmount: ethers.formatEther(p[5])
        });

        // Fetch Live FTSO Data
        try {
            const credit = await pool.getCreditDetails(account);
            setMarketData({
                price: Number(credit[0]) / 10000000, 
                rawLimit: ethers.formatEther(credit[1]),
                cap: ethers.formatEther(credit[2])
            });
        } catch(e) { console.error("FTSO view call failed, check contract deployment.", e); }
      }
    } catch (err) { console.error("Fetch failed", err); }
  }, [account, signer, poolAddress, poolAbi]); 


  // --- INITIAL LOAD/AUTO-REFRESH CONTROL ---
  useEffect(() => { 
    if (isTransitioning) return; 
    fetchOnChainProfile();
  }, [account, signer, isTransitioning, fetchOnChainProfile]); 

  
  // --- HELPER: Poll blockchain until state changes ---
  const pollUntilStateChanges = async (expectedHasLoan, maxAttempts = 12, interval = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      try {
        const pool = new ethers.Contract(poolAddress, poolAbi, signer);
        const p = await pool.profiles(account);
        if (p[4] === expectedHasLoan) {
          // State has changed as expected
          return true;
        }
      } catch (err) {
        console.error("Poll check failed:", err);
      }
    }
    return false; // Timeout
  };

  // --- 1. GASLESS SYNC (SERVER PAYS GAS) ---
  const syncData = async () => {
    setLoading(true);
    setStatus({ type: "info", msg: "Verifying & Syncing (Gasless)..." });
    try {
      const res = await fetch(`${backendUrl}/api/sync-profile`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerAddress: account }) 
      });
      const apiRes = await res.json();
      if (!apiRes.success) throw new Error(apiRes.error);

      setStatus({ type: "success", msg: "Profile Synced! (Server Paid Gas)" });
      setIsTransitioning(true); // LOCK UI

      // Optimistic Update
      setProfile(prev => ({ 
          ...prev, 
          earnings: ethers.formatEther(apiRes.data.earnings), 
          score: apiRes.data.score,
          tenure: apiRes.data.tenure,
          hasLoan: false,
      }));
      
      // Poll until blockchain confirms state change
      await pollUntilStateChanges(false, 12, 1000);
      await fetchOnChainProfile();
      setIsTransitioning(false); 

    } catch (err) { 
        console.error(err);
        setStatus({ type: "error", msg: "Sync Failed: " + err.message }); 
        setIsTransitioning(false);
    }
    setLoading(false);
  };
  
  // --- 2. GASLESS BORROW (SMART ACCOUNT) ---
  const borrowGasless = async () => {
    setLoading(true);
    setStatus({ type: "info", msg: "Signing Request (No Gas Cost)..." });
    try {
      const deadline = Math.floor(Date.now() / 1000) + 3600; 
      let nonceBigInt;
      try {
        const pool = new ethers.Contract(poolAddress, poolAbi, signer);
        nonceBigInt = await pool.nonces(account); 
      } catch (e) {
        throw new Error("Blockchain connection error: Could not read current Nonce. Please refresh.");
      }
      const addressToSign = account.toLowerCase(); 
      const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "string"],
        [addressToSign, nonceBigInt, deadline, "BORROW"]
      );
      const signature = await signer.signMessage(ethers.getBytes(messageHash));
      setStatus({ type: "info", msg: "Sending to Relayer..." });

      const res = await fetch(`${backendUrl}/api/relay-borrow`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: addressToSign, signature: signature, deadline: deadline, nonce: nonceBigInt.toString() })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setStatus({ type: "success", msg: "Gasless Loan Successful! Tx: " + data.txHash.slice(0, 10) + "..." });
      setIsTransitioning(true); // LOCK UI
      
      // Poll until blockchain confirms loan state (hasLoan = true)
      const confirmed = await pollUntilStateChanges(true, 12, 1000);
      if (!confirmed) {
        setStatus({ type: "warning", msg: "Loan may still be processing. Refreshing..." });
      }
      await fetchOnChainProfile();
      setIsTransitioning(false); 

    } catch (err) { 
        let cleanMsg = err.message;
        const match = cleanMsg.match(/execution reverted: "([^"]+)"/);
        if (match) cleanMsg = match[1]; 
        setStatus({ type: "error", msg: "Smart Borrow Failed: " + cleanMsg }); 
        setIsTransitioning(false);
    }
    setLoading(false);
  };
  
  // --- 3. STANDARD BORROW (USER PAYS GAS) ---
  const borrowNormal = async () => {
    setLoading(true);
    setStatus({ type: "info", msg: "Confirm transaction in MetaMask..." });
    try {
      const pool = new ethers.Contract(poolAddress, poolAbi, signer);
      const tx = await pool.borrow();
      await tx.wait();
      setStatus({ type: "success", msg: "Loan Successful!" });
      setIsTransitioning(true); // LOCK UI
      
      // Poll until blockchain confirms loan state (hasLoan = true)
      const confirmed = await pollUntilStateChanges(true, 12, 1000);
      if (!confirmed) {
        setStatus({ type: "warning", msg: "Loan may still be processing. Refreshing..." });
      }
      await fetchOnChainProfile();
      setIsTransitioning(false); 

    } catch (err) { 
        setStatus({ type: "error", msg: "Borrow Failed: " + err.message }); 
        setIsTransitioning(false);
    }
    setLoading(false);
  };
  
  // --- 4. REPAY LOGIC ---
  const repay = async () => {
    setLoading(true);
    setStatus({ type: "info", msg: "Repaying with Interest..." });
    try {
      const pool = new ethers.Contract(poolAddress, poolAbi, signer);
      const principal = ethers.parseEther(profile.loanAmount || "4");
      const interest = (principal * 5n) / 100n; 
      const tx = await pool.repay({ value: principal + interest });
      await tx.wait();
      setStatus({ type: "success", msg: "Loan Repaid!" });
      setIsTransitioning(true); // LOCK UI
      
      // Poll until blockchain confirms loan is repaid (hasLoan = false)
      const confirmed = await pollUntilStateChanges(false, 12, 1000);
      if (!confirmed) {
        setStatus({ type: "warning", msg: "Repayment may still be processing. Refreshing..." });
      }
      await fetchOnChainProfile();
      setIsTransitioning(false); 

    } catch (err) { 
        setStatus({ type: "error", msg: "Repay Failed: " + err.message }); 
        setIsTransitioning(false);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">User: {account?.slice(0,6)}...</h2>
          {profile && <span className="bg-green-500 text-xs px-2 py-1 rounded font-bold">VERIFIED</span>}
        </div>

        <div className="p-6">
          {!profile ? (
            <div className="text-center py-8">
               <button onClick={syncData} disabled={loading} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">
                 {loading ? <Loader2 className="animate-spin w-5 h-5"/> : <><RefreshCw className="w-5 h-5"/> Sync from Swiggy</>}
               </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* STATS GRID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl"><p className="text-xs text-blue-600 font-bold">Earnings</p><p className="text-xl font-bold">${parseInt(profile.earnings)}</p></div>
                <div className="bg-purple-50 p-4 rounded-xl"><p className="text-xs text-purple-600 font-bold">Score</p><p className="text-xl font-bold">{profile.score}</p></div>
              </div>

              {/* FTSO DATA DISPLAY (FIXED RENDERING) */}
              {marketData && !profile.hasLoan && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm">
                      <div className="flex items-center gap-2 mb-2 text-slate-500 font-bold uppercase text-xs tracking-wider">
                          <TrendingUp className="w-4 h-4" /> Live FTSO v2 Oracle
                      </div>
                      <div className="flex justify-between items-center mb-1">
                          <span>Live FLR Price:</span>
                          <span className="font-mono font-bold text-slate-800">${marketData.price.toFixed(5)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1 text-green-700 font-medium border-b border-dashed border-green-200 pb-1">
                          <span>Calculated Eligibility:</span>
                          <span className="font-bold">{parseFloat(marketData.rawLimit).toFixed(2)} FLR</span>
                      </div>
                      <div className="flex justify-between items-center text-orange-600 pt-2">
                          <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Final Loan Cap:</span>
                          <span className="font-bold text-lg">{marketData.cap} FLR</span>
                      </div>
                  </div>
              )}

              {profile.hasLoan ? (
                <div className="space-y-3">
                    <div className="bg-yellow-50 p-4 rounded-xl text-center"><p className="text-xs font-bold text-yellow-600 uppercase">Balance Due</p><p className="text-3xl font-bold text-gray-800">{parseFloat(profile.loanAmount).toFixed(2)} FLR</p></div>
                    <button onClick={repay} disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Repay Loan</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div onClick={() => setIsGasless(!isGasless)} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer border border-gray-200 transition-colors hover:bg-gray-100">
                    <div className="flex items-center gap-2"><Zap className={`w-5 h-5 ${isGasless ? "text-orange-500" : "text-gray-400"}`} /><div><p className="text-sm font-bold text-gray-700">Smart Account</p><p className="text-xs text-gray-500">{isGasless ? "Platform pays gas" : "You pay gas"}</p></div></div>
                    {isGasless ? <ToggleRight className="w-8 h-8 text-green-500"/> : <ToggleLeft className="w-8 h-8 text-gray-400"/>}
                  </div>
                  <button onClick={isGasless ? borrowGasless : borrowNormal} disabled={loading} className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 ${isGasless ? "bg-purple-600 text-white" : "bg-green-600 text-white"}`}>
                    {loading ? <Loader2 className="animate-spin" /> : (isGasless ? "Get Loan (Gasless)" : "Get Loan (Standard)")}
                  </button>
                </div>
              )}
            </div>
          )}
          <StatusCard status={status} />
        </div>
      </div>
    </div>
  );
}