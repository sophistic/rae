import React from "react";
import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

interface WelcomeProps {
  onNext: (step: string) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNext }) => {
  const { loggedIn } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Repeatedly invoke every 500ms
    const intervalId = setInterval(() => {
      invoke("close_magic_dot").catch(console.error);
    }, 500);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  const handleNext = () => {
    if (loggedIn) {
      navigate("/landing");
    }
    onNext("auth");
  };
  return (
    <div className="drag min-h-screen flex items-center rounded-md justify-center bg-gradient-to-b from-white to-yellow-200">
      <div className="text-center p-8">
        <h1 className="text-5xl font-instrument-serif font-normal italic leading-none mb-2">
          Quack
        </h1>
        <p className="text-lg text-gray-700 mb-8">Let Quack answers your queries</p>
        <button
          onClick={() => handleNext()}
          className="no-drag px-8 py-3 bg-black text-white rounded-full shadow-lg hover:scale-105 transition"
        >
          Get started
        </button>
      </div>
    </div>
  );
};

export default Welcome;
