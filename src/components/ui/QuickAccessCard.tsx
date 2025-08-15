import React from "react";
import Button from "@/components/ui/Button";
import { motion } from "motion/react";

interface QuickAccessCardProps {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}

const QuickAccessCard: React.FC<QuickAccessCardProps> = ({ icon, label, onClick, className }) => (
  <motion.div className="h-[100px]" whileTap={{ scale: 0.9 }} whileHover="hover">
    <Button
      className={`no-drag flex duration-75 hover:text-foreground size-full flex-col items-center justify-center p-4 rounded-lg cursor-pointer border-2 border-border relative hover:border-surface bg-background hover:bg-surface text-foreground hover:text-background group !transition-none overflow-hidden ${className ?? ""}`}
      onClick={onClick}
    >
      <motion.div
        variants={{
          hover: {
            rotate: 20,
          },
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
        className="absolute top-0 right-0 scale-[5] !transition-none -translate-x-[20%] !text-zinc-200 dark:!text-white/10 !stroke-1 group-hover:!text-zinc-500 dark:group-hover:!text-background/30"
      >
        {icon}
      </motion.div>
      <span className="mt-2 text-sm font-semibold z-10 absolute bottom-0 left-0 m-2 ">{label}</span>
    </Button>
  </motion.div>
);

export default QuickAccessCard;
