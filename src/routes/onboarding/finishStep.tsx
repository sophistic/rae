import React from "react";
// import { invoke } from "@tauri-apps/api/core"; // for closing func
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/store/userStore";
interface FinishProps {
  onNext: (step: string) => void;
}
const FinishStep: React.FC<FinishProps> = ({ onNext }) => {
  const navigate = useNavigate();
  const { loggedIn } = useUserStore();
  const handleFinish = () => {
    if (loggedIn) {
      navigate("/landing");
    }
    onNext("fetchInfo");
  };
  return (
    <div className="drag rounded-md h-screen w-screen flex items-center justify-center bg-white">
      <div className="bg-white rounded-xl p-10 w-full max-w-md text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          You're all set!
        </h2>
        <p className="text-gray-600 mb-6">
          You can now use Quack to its full potential.
        </p>
        <button
          onClick={handleFinish} // added this to close the onboarding section...
          className="no-drag bg-black text-white font-medium px-6 py-2 rounded-md hover:opacity-90 transition"
        >
          Finish
        </button>
      </div>
    </div>
  );
};

export default FinishStep;
