import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TrendingUp, History, Download, Loader2, RefreshCw, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import StatusCard from "./StatusCard";

export default function LenderPanel({ signer, poolAddress, poolAbi }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [myShares, setMyShares] = useState("0");
  const [sharePercent, setSharePercent] = useState("0");
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- 1. FETCH DATA (Shares & History) ---
  const fetchData = async () => {
    if (!signer) return;
    setIsRefreshing(true);
    
    try {
      const pool = new ethers.Contract(poolAddress, poolAbi, signer);
      const address = await signer.getAddress();

      // A. Get Share Balance
      const sharesRaw = await pool.shares(address);
      setMyShares(ethers.formatEther(sharesRaw));

      // B. Calculate Percentage of Pool Ownership
      const totalShares = await pool.totalShares();
      if (totalShares > 0n) {
        // (MyShares * 100) / TotalShares
        const percent = (sharesRaw * 100n) / totalShares;
        setSharePercent(percent.toString());
      } else {
        setSharePercent("0");
      }

      // C. Get Recent History (Safe RPC Limit -20)
      // We look for both Deposits and Withdrawals
      const filterDeposit = pool.filters.DepositReceived(address);
      const filterWithdraw = pool.filters.Withdrawal(address);
      
      const deposits = await pool.queryFilter(filterDeposit, -20);
      const withdrawals = await pool.queryFilter(filterWithdraw, -20);

      // Merge and Sort
      const allEvents = [...deposits, ...withdrawals].sort((a, b) => b.blockNumber - a.blockNumber);

      const history = allEvents.map(e => ({
        type: e.eventName === "DepositReceived" ? "Deposit" : "Withdraw",
        amount: ethers.formatEther(e.args[1]), // args[1] is always FLR amount
        shares: ethers.formatEther(e.args[2]), // args[2] is always Shares
        hash: e.transactionHash,
        block: e.blockNumber
      }));

      setTransactions(history);

    } catch (err) {
      console.error("Error fetching lender data:", err);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [signer]);

  // --- 2. DEPOSIT FUNCTION ---
  const deposit = async () => {
    if (!amount) return;
    setLoading(true);
    setStatus({ type: "info", msg: "Depositing funds..." });
    try {
      const pool = new ethers.Contract(poolAddress, poolAbi, signer);
      const tx = await pool.deposit({ value: ethers.parseEther(amount) });
      await tx.wait();
      
      setStatus({ type: "success", msg: "Deposit Successful! Shares Minted." });
      setAmount("");
      fetchData();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", msg: "Deposit Failed: " + (err.reason || err.message) });
    }
    setLoading(false);
  };

  // --- 3. WITHDRAW FUNCTION ---
  const withdraw = async () => {
    if (!amount) return;
    setLoading(true);
    setStatus({ type: "info", msg: "Burning shares to withdraw FLR..." });
    try {
      const pool = new ethers.Contract(poolAddress, poolAbi, signer);
      
      // For this demo, we treat the input as "Shares to Burn" roughly 1:1
      // In a real app, you'd calculate exact share price conversion
      const sharesToBurn = ethers.parseEther(amount);
      
      const tx = await pool.withdraw(sharesToBurn);
      await tx.wait();
      
      setStatus({ type: "success", msg: "Withdrawal Successful! Funds sent to wallet." });
      setAmount("");
      fetchData();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", msg: "Withdraw Failed: " + (err.reason || err.message) });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* LEFT COLUMN: ACTIONS */}
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> Liquidity Pool
            </h2>
            
            <div className="bg-blue-50 p-4 rounded-xl mb-6 flex justify-between items-center">
                <div>
                    <p className="text-xs text-blue-500 font-bold uppercase">My Balance</p>
                    <p className="text-xl font-bold text-blue-900">{parseFloat(myShares).toFixed(2)} Shares</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-blue-500 font-bold uppercase">Ownership</p>
                    <p className="text-xl font-bold text-blue-900">{sharePercent}%</p>
                </div>
            </div>

            <div className="flex gap-4">
            <input 
                className="flex-1 p-4 bg-gray-50 border rounded-xl placeholder-black text-black"
                placeholder="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
                <button 
                    onClick={deposit} disabled={loading}
                    className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <><ArrowUpCircle className="w-4 h-4"/> Deposit</>}
                </button>
                <button 
                    onClick={withdraw} disabled={loading}
                    className="bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <><ArrowDownCircle className="w-4 h-4"/> Withdraw</>}
                </button>
            </div>

            <StatusCard status={status} />
        </div>
      </div>

      {/* RIGHT COLUMN: MY HISTORY */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-700">
            <History className="w-5 h-5" /> My Recent Activity
            </h3>
            <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-full">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
        </div>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-gray-400 text-sm">No recent transactions.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {transactions.map((tx, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.type === 'Deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.type === 'Deposit' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-bold">{tx.type}</p>
                        <p className="font-mono text-xs text-gray-600">Block {tx.block}</p>
                    </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{parseFloat(tx.amount).toFixed(2)} FLR</p>
                  <p className="text-xs text-gray-400">{parseFloat(tx.shares).toFixed(2)} Shares</p>
                </div>
                <a href={`https://coston2-explorer.flare.network/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-600">
                    <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}