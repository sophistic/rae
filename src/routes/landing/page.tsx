import { invoke } from "@tauri-apps/api/core";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Keyboard,
  Brain,
  MoreHorizontal,
  Settings,
  Sparkle,
  MessageSquareIcon,
  Wrench,
} from "lucide-react";
import { LaunchOverlayWindow } from "../overlay/OverlayLauncher";
import { useUserStore } from "@/store/userStore";
import React, { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";
import Button from "@/components/ui/Button";
import { motion } from "motion/react";

export default function Landing() {
  const { clearUser, name, loggedIn, showSplash, setShowSplash } =
    useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [shrunk, setShrunk] = useState<boolean>(false);

  useEffect(() => {
    // Only launch the magic dot when logged in
    if (loggedIn) {
      LaunchOverlayWindow();
    }
  }, [loggedIn]);

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
    <motion.div whileTap={{ scale: 0.9 }} whileHover="hover">
      <Button
        className={`no-drag flex duration-75  hover:text-white size-full flex-col items-center justify-center p-4 rounded-lg  cursor-pointer border-2 border-gray-200 relative hover:border-black bg-white hover:bg-zinc-950 text-black group !transition-none  overflow-hidden ${
          className ?? ""
        }`}
        onClick={onClick}
        style={{ minHeight: "80px" }}
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
          {" "}
          {icon}
        </motion.div>
        <span className="mt-2 text-sm font-semibold z-10 absolute bottom-0 left-0 m-2 ">
          {label}
        </span>
      </Button>
    </motion.div>
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
      onClick: () => navigate("/app/settings"),
    },
    {
      icon: <Sparkle />,
      label: "Integrations",
    },
    {
      icon: <Keyboard />,
      label: "Shortcuts",
      onClick: () => navigate("/app/settings/shortcuts"),
    },
    {
      icon: <Brain />,
      label: "Memory",
    },
    {
      icon: <Wrench className="rotate-180" />,
      label: "Preferences",
      onClick: () => navigate("/app/settings/preferences"),
    },
  ];

  return (
    <>
      {showSplash && <SplashScreen onFadeOut={() => setShowSplash(false)} />}
      <div
        className="h-full flex w-full flex-col items-center justify-center overflow-hidden text-black transition-transform duration-300 ease-in-out"
        style={{
          transform: `scale(${shrunk ? 0.9 : 1})`,
          transformOrigin: "top center",
        }}
      >
        <div className="bg-white w-full flex flex-col items-center justify-center flex-grow p-8">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "circInOut" }}
            className="text-3xl mb-4 font-instrument-sans tracking-tighter font-semibold"
          >
            Welcome back, {name?.split(" ")[0]}
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
    </>
  );
}
