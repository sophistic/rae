import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
import {
  Keyboard,
  Brain,
  MoreHorizontal,
  Settings,
  Sparkle,
  MessageSquareIcon,
} from "lucide-react";
import { launchMagicDotWindow } from "../overlay/MagicDotLauncher";
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import { motion } from "motion/react";

export default function Landing() {
  const { clearUser, name } = useUserStore();
  const navigate = useNavigate();
  launchMagicDotWindow();
  const [shrunk, setShrunk] = useState<boolean>(false);

  const QuickAccessButton = ({
    icon,
    label,
    bgColor = "bg-gray-100",
    textColor = "text-black",
    onClick,
    customContent,
    className,
  }: {
    icon?: React.ReactNode;
    label: string;
    bgColor?: string;
    textColor?: string;
    onClick?: () => void;
    customContent?: React.ReactNode;
    className?: string;
  }) => (
    <Button
      className={`no-drag flex duration-75 hover:text-white size-full flex-col items-center justify-center p-4 rounded-lg  cursor-pointer border-2 border-gray-200 relative hover:border-black bg-white hover:bg-zinc-950 text-black  ${
        className ?? ""
      }`}
      onClick={onClick}
      style={{ minHeight: "80px" }}
    >
      <div className=""> {customContent ? customContent : icon}</div>
      <span className="mt-2 text-sm font-medium z-10">{label}</span>
    </Button>
  );

  const quickAccessButtons = [
    {
      label: "Open Chat",
      bgColor: "bg-white border-orange-300",
      textColor: "text-black",
      icon: <MessageSquareIcon />,
      className: "overflow-hidden border-2",
      onClick: () => navigate("/app/chat"),
    },
    {
      icon: <Settings />,
      label: "Settings",
      // no navigation for Settings
    },
    {
      icon: <Sparkle />,
      label: "Integrations",
      // no navigation for Integrations
    },
    {
      icon: <Keyboard />,
      label: "Shortcuts",
      onClick: () => navigate("/app/shortcuts"),
    },
    {
      icon: <Brain />,
      label: "Memory",
    },
    {
      icon: <MoreHorizontal />,
      label: "Preferences",
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden text-black transition-transform duration-300 ease-in-out"
      style={{
        transform: `scale(${shrunk ? 0.9 : 1})`,
        transformOrigin: "top center",
      }}
    >
      <div className="bg-white flex flex-col items-center justify-center flex-grow p-8">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "circInOut" }}
          className="text-3xl mb-4 font-instrument-sans tracking-tighter font-normal"
        >
          Welcome back, {name}
        </motion.div>
        {/* <p className="text-gray-500 mb-6">Quick access</p> */}

        <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
          {quickAccessButtons.map((props, idx) => (
            <motion.div
              className="size-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              key={props.label}
            >
              <QuickAccessButton {...props} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
