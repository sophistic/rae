import React, { ReactNode } from "react";
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
            transition={{ ease: "backInOut", duration: 0.3 }}
            animate={{ x: active ? "0%" : "-50%" }}
            className="h-[42px] absolute w-[180px] text-sm font-medium px-4 py-2 flex gap-2 items-center  "
          >
            {icon} {children}
          </motion.div>
        </motion.div>
        <div className="size-full px-4 py-2 flex gap-2 items-center font-medium text-sm">
          {icon} {children}
        </div>
      </motion.button>
    </motion.div>
  );
};

export default ChatSidebarButton;
