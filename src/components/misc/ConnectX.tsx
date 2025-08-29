import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ConnectXProps {
  provider: "notion" | "google-drive" | "one-drive";
  email: string;
}

const ConnectX: React.FC<ConnectXProps> = ({ provider, email }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // The Rust command now handles opening the browser directly
      await invoke("create_connection", {
        provider,
        email,
      });
    } catch (err: any) {
      console.error("Connection error:", err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const providerColors: Record<string, string> = {
    notion: "bg-gray-800 hover:bg-gray-700",
    "google-drive": "bg-green-600 hover:bg-green-500",
    "one-drive": "bg-blue-600 hover:bg-blue-500",
  };

  return (
    <div className="flex flex-col items-start gap-2 scale-75 animate-spin text-sm">
      <button
        onClick={handleConnect}
        disabled={loading}
        className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors duration-200 ${
          providerColors[provider]
        } ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading ? "Opening browser..." : `Connect ${provider}`}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default ConnectX;
