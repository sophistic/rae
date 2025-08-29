import React, { useState } from "react";

interface ConnectXProps {
  provider: "notion" | "google-drive" | "one-drive";
  email: string;
  redirectUrl: string;
}

const ConnectX: React.FC<ConnectXProps> = ({
  provider,
  email,
  redirectUrl,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.supermemory.ai/v3/connections/${provider}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer sm_i7RKz38FUYJD4HfT9AMF9k_GvbgSSRBxGRZklEgjmXvrkkMUbGDUJRLgcuFjjJFlYXpPXnXzjuZgOexCBDuLlwW`,
          },
          body: JSON.stringify({
            redirectUrl,
            containerTags: [email],
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error: ${response.status} ${errText}`);
      }

      const json = (await response.json()) as {
        id: string;
        authLink: string;
        expiresIn: string;
        redirectsTo: string;
      };

      window.location.href = json.authLink;
    } catch (err: any) {
      console.error("Connection error:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleConnect} disabled={loading}>
        {loading ? "Connecting..." : `Connect ${provider}`}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default ConnectX;
