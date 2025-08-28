import React from "react";
import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Button from "@/components/ui/Button";
import { motion } from "motion/react";

interface WelcomeProps {
  onNext: (step: string) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNext }) => {
  const { loggedIn, showSplash, setShowSplash } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Close any stray magic dot once on load; avoid repeated closing to allow user toggles
    invoke("close_magic_dot").catch(console.error);
  }, []);
  const handleNext = () => {
    
    onNext("auth");
  };
  return (
    <div className="drag min-h-screen flex items-center rounded-md justify-center bg-white relative">
      <div className="text-center p-8 z-[1000]">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "circInOut", type: "tween" }}
          className="text-6xl !font-instrument-sans !tracking-tighter  mb-2"
        >
          Rae
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: "circInOut",
            type: "tween",
            delay: 0.1,
          }}
          
          className="text-smd text-black font-medium  mb-5"
        >
          Your personal assistant
        </motion.p>
        {!loggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              ease: "circInOut",
              type: "tween",
              delay: 0.2,
            }}
          >
            <Button onClick={() => handleNext()} className="w-[200px]">
              Get started
            </Button>
          </motion.div>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.3, duration: 1 }}
        onAnimationComplete={() => {
          if (loggedIn) {
            setShowSplash(true);
            navigate("/app/landing");
          }
        }}
        className="absolute z-10 size-[80vw] bottom-0 translate-y-1/2 rounded-full bg-[#FFF200] [filter:blur(100px)] opacity-60"
      ></motion.div>
    </div>
  );
};

export default Welcome;
