import React, { useState } from "react";
import { NameUpdate } from "@/api/updates";
import { useUserStore } from "@/store/userStore";
import { Loader } from "lucide-react";

interface NameProps {
  onNext: (step: string) => void;
}

const Name: React.FC<NameProps> = ({ onNext }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const { email, setUser } = useUserStore();
  const handleContinue = async () => {
    if (name.trim()) {
      setLoading(true);
      try {
        const result = await NameUpdate(name, email);
        if (!result.success) {
          setError(result.message);
          return;
        }
        console.log("Name update Success");
        setUser({ name: name });
        onNext("magic_dot");
      } catch (err: any) {
        console.error("Name update Error:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="drag min-h-screen flex rounded-md items-center justify-center bg-white">
      <div className="text-center p-8 w-full max-w-sm">
        <h1 className="text-2xl font-serif mb-6">What should we call you?</h1>

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="no-drag w-full mb-6 px-4 py-2 border rounded-md bg-gray-50 focus:outline-none"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          onClick={handleContinue}
          className="no-drag w-full py-2 rounded-xl bg-black flex justify-center items-center text-white font-medium shadow-md hover:scale-105 transition"
        >
          {loading ? <Loader className="animate-spin" /> : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default Name;
