import React, { useState } from "react";

interface NameProps {
  onNext: (step: string) => void;
}

const Name: React.FC<NameProps> = ({ onNext }) => {
  const [name, setName] = useState("");

  const handleContinue = () => {
    if (name.trim()) {
      onNext("magic_dot"); // Proceed to next onboarding step
    }
  };

  return (
    <div className="drag min-h-screen flex items-center justify-center bg-white">
      <div className="text-center p-8 w-full max-w-sm">
        <h1 className="text-2xl font-serif mb-6">What should we call you?</h1>

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="no-drag w-full mb-6 px-4 py-2 border rounded-md bg-gradient-to-b from-white to-gray-100 focus:outline-none"
        />

        <button
          onClick={handleContinue}
          className="no-drag w-full py-2 rounded-xl bg-black text-white font-medium shadow-md hover:scale-105 transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default Name;
