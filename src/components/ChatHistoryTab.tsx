import React, { useRef, useLayoutEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

interface ChatHistoryTabProps {
  message: string;
  active?: boolean;
  onClick?: () => void;
}


const ChatHistoryTab: React.FC<ChatHistoryTabProps> = ({ message, active = false, onClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (active && textRef.current && containerRef.current) {
      const tWidth = textRef.current.scrollWidth;
      const cWidth = containerRef.current.offsetWidth;
      setTextWidth(tWidth);
      setContainerWidth(cWidth);
      setShouldAnimate(tWidth > cWidth);
    } else {
      setShouldAnimate(false);
    }
  }, [active, message]);

  useLayoutEffect(() => {
    if (shouldAnimate && active) {
      // Account for padding (px-4 = 1rem left/right = 16px each) and a small buffer
      const padding = 32 + 8; // 32px for px-4, 8px buffer
      const distance = textWidth - containerWidth + padding;
      controls.start({
        x: [0, -distance, -distance, 0, 0],
        transition: {
          x: {
            times: [0, 0.4, 0.6, 0.9, 1],
            duration: 8 + distance / 30,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          },
        },
      });
    } else {
      controls.stop();
      controls.set({ x: 0 });
    }
  }, [shouldAnimate, active, textWidth, containerWidth, controls]);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`px-4 py-2 group whitespace-nowrap overflow-hidden font-medium rounded-lg text-sm relative mb-1 cursor-pointer transition-colors ${
        active ? "bg-zinc-950 text-white shadow-[inset_0_-4px_4px_rgba(0,0,0,0.07),inset_0_4px_4px_rgba(255,255,255,0.25)]" : "bg-zinc-100 text-black hover:bg-zinc-300"
      }`}
      style={{ maxWidth: '100%' }}
    >
      <motion.div
        ref={textRef}
        animate={controls}
        style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
      >
        {message}
      </motion.div>
      <div className={`pointer-events-none absolute right-0 top-0 h-full w-1/4 bg-gradient-to-r from-transparent via-${active ? "black" : "zinc-100"} to-${active ? "black" : "zinc-100 "} ${!active && "group-hover:to-zinc-300 group-hover:via-zinc-300"} transition-colors`}></div> 
    </div>
  );
};

export default ChatHistoryTab;
