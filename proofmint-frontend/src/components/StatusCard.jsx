import React from "react";
import { CheckCircle, AlertTriangle, Loader2, Info, XCircle } from "lucide-react";

export default function StatusCard({ status }) {
  // If no message, render nothing
  if (!status || !status.msg) return null;

  // Define styles based on status type
  const styles = {
    loading: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-100",
      icon: <Loader2 className="w-5 h-5 animate-spin" />
    },
    success: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-100",
      icon: <CheckCircle className="w-5 h-5" />
    },
    error: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-100",
      icon: <XCircle className="w-5 h-5" />
    },
    info: {
      bg: "bg-gray-50",
      text: "text-gray-600",
      border: "border-gray-100",
      icon: <Info className="w-5 h-5" />
    }
  };

  // Fallback to 'info' if type is unknown
  const currentStyle = styles[status.type] || styles.info;

  return (
    <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border ${currentStyle.bg} ${currentStyle.border}`}>
      <div className={`mt-0.5 ${currentStyle.text}`}>
        {currentStyle.icon}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${currentStyle.text}`}>
          {status.msg}
        </p>
        {status.txHash && (
          <a 
            href={`https://coston2-explorer.flare.network/tx/${status.txHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline opacity-80 hover:opacity-100 mt-1 block"
          >
            View on Explorer ↗
          </a>
        )}
      </div>
    </div>
  );
}