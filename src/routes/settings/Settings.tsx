
import { useNavigate } from "react-router-dom";
import { Keyboard, Wrench } from "lucide-react";
import React from "react";
import Button from "@/components/ui/Button";
import { motion } from "motion/react";

const SettingsButton = ({
  icon,
  label,
  onClick,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
}) => (
  <motion.div className="h-[100px]" whileTap={{ scale: 0.9 }} whileHover="hover">
    <Button
      className={`no-drag  flex duration-75 hover:text-white size-full flex-col items-center justify-center p-4 rounded-lg cursor-pointer border-2 border-gray-200 relative hover:border-black bg-white hover:bg-zinc-950 text-black group !transition-none overflow-hidden ${className ?? ""}`}
      onClick={onClick}
    //   style={{ minHeight: "80px" }}
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
        className="absolute top-0 right-0 scale-[5] !transition-none -translate-x-[20%] !text-zinc-200 !stroke-1 group-hover:!text-zinc-500"
      >
        {icon}
      </motion.div>
      <span className="mt-2 text-sm font-semibold z-10 absolute bottom-0 left-0 m-2 ">{label}</span>
    </Button>
  </motion.div>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="size-full grid grid-cols-3 gap-1 p-1">
      <SettingsButton
        icon={<Wrench className="rotate-180" />}
        label="Preferences"
        onClick={() => navigate("/app/settings/preferences")}
      />
      <SettingsButton
        icon={<Keyboard />}
        label="Shortcuts"
        onClick={() => navigate("/app/settings/shortcuts")}
      />
    </div>
  );
};

export default SettingsPage;