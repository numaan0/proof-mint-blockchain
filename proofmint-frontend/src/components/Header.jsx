import React from "react";
import { Wallet, LogOut } from "lucide-react";

export default function Header({ account, connect, disconnect }) {
  return (
    <header className="bg-white border-b border-gray-100 py-4 px-4 sm:px-6 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-orange-600 p-2 rounded-lg">
          <Wallet className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">ProofMint</h1>
          <p className="text-xs text-gray-500">Flare Network • Coston2</p>
        </div>
      </div>

      <div>
        {!account ? (
          <button
            onClick={connect}
            className="bg-gray-900 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-all flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" /> <span className="hidden sm:inline">Connect </span>Wallet
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Connected as</p>
              <p className="text-sm font-bold text-gray-900 font-mono">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>
            <button
              onClick={disconnect}
              className="bg-gray-100 p-2.5 rounded-xl hover:bg-gray-200 text-gray-600 transition-all"
              title="Disconnect"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}