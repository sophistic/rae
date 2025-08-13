import React, { useEffect } from "react";
import { motion } from "motion/react";

interface SplashProps {
  onFadeOut?: () => void;
}

const SplashScreen: React.FC<SplashProps> = ({ onFadeOut }) => {
  

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      onAnimationComplete={() => {
        if (onFadeOut) onFadeOut();
      }}
      className="fixed inset-0 rounded-lg top-0 left-0 z-[1000] flex items-center justify-center bg-white "
      style={{ pointerEvents: "none" }}
    >
      <div className="text-center p-8 z-50">
        <motion.div
         
          transition={{ duration: 0.5, ease: "circInOut", type: "tween" }}
          className="text-6xl !font-instrument-sans !tracking-tighter mb-2"
        >
          Quack
        </motion.div>
        <motion.p
          
          transition={{ duration: 0.5, ease: "circInOut", type: "tween", delay: 0.1 }}
          className="text-smd text-black font-medium mb-5"
        >
          Your personal assistant
        </motion.p>
      </div>
      <motion.div
       
        transition={{ delay: 0.3, duration: 1 }}
        className="absolute z-10 size-[80vw] bottom-0 translate-y-1/2 rounded-full bg-[#FFF200] [filter:blur(100px)] opacity-60"
      ></motion.div>
    </motion.div>
  );
};

export default SplashScreen;
