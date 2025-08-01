import React from "react";

interface WelcomeProps {
  onNext: (step: string) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNext }) => {
  return (
    <div className="drag min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-yellow-200">
      <div className="text-center p-8">
        <h1 className="text-5xl font-instrument-serif font-normal italic leading-none mb-2">
          Quack
        </h1>
        <p className="text-lg text-gray-700 mb-8">Your personal assistant</p>
        <button
          onClick={() => onNext("auth")}
          className="no-drag px-8 py-3 bg-black text-white rounded-full shadow-lg hover:scale-105 transition"
        >
          Get started
        </button>
      </div>
    </div>
  );
};

export default Welcome;