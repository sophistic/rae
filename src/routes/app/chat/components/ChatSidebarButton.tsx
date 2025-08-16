import React, { ReactNode, useRef, useLayoutEffect, useState } from "react";
import { motion } from "motion/react";

interface ChatSidebarButtonProps {
  children: ReactNode;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

const ChatSidebarButton: React.FC<ChatSidebarButtonProps> = ({
  children,
  icon,
  active = false,
  onClick,
}) => {
  // Refs and state for scroll animation
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    if (textRef.current) {
      setIsOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [children]);

  // Animation settings
  const scrollDistance = textRef.current && isOverflowing ? textRef.current.scrollWidth - textRef.current.clientWidth : 0;
  const scrollDuration = scrollDistance ? Math.max(2, scrollDistance / 20) : 2;

  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="px-[4px] py-[2px] group w-fit overflow-visible"
    >
      <motion.button
        className={`flex rounded-md h-[42px] w-[180px] text-foreground relative  items-center justify-center  shrink-0 overflow-visible ${
          active
            ? "bg-foreground/10"
            : "bg-background group-hover:bg-foreground/10"
        }`}
      >
        <motion.div
          initial={{
            width: active ? "180px" : "0px",
            height: active ? "42px" : "0px",
            borderRadius: active ? "8px" : "16px",
            borderColor: active ? "black" : "transparent",
          }}
          animate={{
            width: active ? "180px" : "0px",
            height: active ? "42px" : "0px",
            borderRadius: active ? "8px" : "16px",
            borderColor: active ? "black" : "transparent",
          }}
          transition={{
            ease: "backInOut",
            duration: 0.3,
            height: {
              ease: "backInOut",
              duration: 0.2,
            },
          }}
          className="absolute pointer-events-none shadow-[inset_0_-4px_4px_rgba(0,0,0,0.07),inset_0_4px_4px_rgba(255,255,255,0.25)]  size-full  overflow-hidden flex items-center  bg-surface rounded-md text-background  gap-2 "
        >
          <motion.div
            ref={textRef}
            className="h-[42px] absolute w-[180px] text-sm font-medium px-4 py-2 flex gap-2 items-center whitespace-nowrap "
            animate={
              active && isOverflowing
                ? { x: [0, -scrollDistance, 0] }
                : { x: 0 }
            }
            transition={
              active && isOverflowing
                ? { repeat: Infinity, duration: scrollDuration, ease: "linear" }
                : { duration: 0.3, ease: "backInOut" }
            }
          >
            {children}
          </motion.div>
        </motion.div>
        <div className="size-full px-4 py-2 flex gap-2 whitespace-nowrap items-center font-medium text-sm overflow-hidden">
          {children}
        </div>
      </motion.button>
    </motion.div>
  );
};

export default ChatSidebarButton;
