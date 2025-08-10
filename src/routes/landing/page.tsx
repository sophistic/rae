import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
import {
  Keyboard,
  Brain,
  MoreHorizontal,
  SquareArrowOutUpRight,
  Settings,
  Sparkle,
  MessageSquareIcon,
} from "lucide-react";
import { launchMagicDotWindow } from "../overlay/MagicDotLauncher";
import React, { useState } from "react";
import WindowControls from "@/components/WindowControls";
import Logo from "@/assets/enhanced_logo.png";
import IntegrationsIcon from "@/assets/integrations.svg";
import SettingsIcon from "@/assets/settings.png";
import CircleIcon from "@/assets/circle.png";
import Button from "@/components/ui/Button";
import { motion } from "motion/react";

export default function Landing() {
  const { clearUser, name } = useUserStore();
  const navigate = useNavigate();
  launchMagicDotWindow();
  const [shrunk, setShrunk] = useState<boolean>(false);

  const handlelogout = () => {
    clearUser();
    invoke("close_magic_dot").catch(console.error);
    navigate("/");
  };

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
      className={`no-drag flex size-full flex-col items-center justify-center p-4 rounded-lg  cursor-pointer border-2 border-gray-200 relative hover:border-black bg-white hover:bg-slate-100 text-black  ${
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
    },
    {
      icon: <Settings />,
      label: "Settings",
      onClick: () => navigate("/shortcuts"),
    },
    {
      icon: <Sparkle />,
      label: "Integrations",
      onClick: () => navigate("/shortcuts"),
    },
    {
      icon: <Keyboard />,
      label: "Shortcuts",
      onClick: () => navigate("/shortcuts"),
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
      className="min-h-screen flex flex-col rounded-md overflow-hidden text-black transition-transform duration-300 ease-in-out"
      style={{
        transform: `scale(${shrunk ? 0.9 : 1})`,
        transformOrigin: "top center",
      }}
    >
      {/* Black Title Bar */}
      <div className="drag flex h-[36px] items-center justify-between p-0 bg-zinc-950 text-white">
        <div className="flex items-center gap-2">
          <img
            src={Logo}
            alt="Quack Logo"
            className="w-6 h-6 ml-2 rounded-full"
          />
          <span className="font-semibold text-sm ">Quack</span>
        </div>
        <div className="no-drag flex items-center h-full ">
          <button
            onClick={handlelogout}
            className=" hover:bg-zinc-800 h-[36px] px-2 text-sm  gap-2 w-fit flex items-center justify-center "
            title="Logout"
          >
            Log out
            <SquareArrowOutUpRight size={12} />
          </button>
          <WindowControls
            shrunk={shrunk}
            onToggleShrink={() => setShrunk((s) => !s)}
          />
        </div>
      </div>

      {/* Main Content */}
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
            <motion.div className="size-full" initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}}
            transition={{ duration: 0.3, delay: idx * 0.1 }}>
              <QuickAccessButton key={props.label} {...props} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
