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
      className={`no-drag flex duration-75  size-full flex-col items-center justify-center p-4 rounded-lg cursor-pointer border-2 border-border relative  bg-background    group  overflow-hidden ${className ?? ""}`}
      onClick={onClick}
    >
      
      <span className="mt-2 text-sm font-semibold z-10 absolute bottom-0 left-0 m-2 ">{label}</span>
    </Button>
  </motion.div>
);

export default QuickAccessCard;
