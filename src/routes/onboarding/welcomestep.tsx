import React from "react";

interface WelcomeProps {
  onNext: (step: string) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNext }) => {
  return (
    <div className=" drag min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-yellow-100">
      <div className="text-center p-8">
        <h1 className="text-5xl font-serif font-semibold mb-2">Quack</h1>
        <p className="text-lg text-black mb-8">Your personal assistant</p>
        <button
          onClick={() => onNext("auth")}
          className="no-drag px-8 py-3 bg-black text-white rounded-xl shadow-md hover:scale-105 transition"
        >
          Get started
        </button>
      </div>
    </div>
  );
};

export default Welcome;
