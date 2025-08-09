import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
import { Keyboard, Brain, MoreHorizontal, SquareArrowOutUpRight } from "lucide-react";
import { launchMagicDotWindow } from "../magicDot/magicDotLauncher";
import React, { useState } from "react";
import WindowControls from "@/components/WindowControls";
import Logo from "@/assets/enhanced_logo.png"
import IntegrationsIcon from "@/assets/integrations.svg"
import SettingsIcon from "@/assets/settings.png"
import CircleIcon from "@/assets/circle.png"

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
   }: {
     icon: React.ReactNode;
     label: string;
     bgColor?: string;
     textColor?: string;
   }) => (
     <div
       className={`no-drag flex flex-col items-center justify-center p-4 rounded-lg shadow-sm cursor-pointer border-2 border-gray-200 ${bgColor} ${textColor}`}
     >
      {icon}
      <span className="mt-2 text-sm font-medium">{label}</span>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col rounded-md overflow-hidden text-black transition-transform duration-300 ease-in-out"
      style={{ transform: `scale(${shrunk ? 0.9 : 1})`, transformOrigin: "top center" }}
    >
      {/* Black Title Bar */}
      <div className="drag flex items-center justify-between p-0 bg-black text-white">
        <div className="flex items-center gap-2">
           <img src={Logo} alt="Quack Logo" className="w-6 h-6 ml-2" />
          <span className="font-semibold">Quack</span>
        </div>
        <div className="no-drag flex items-center gap-2 pr-2">
          <WindowControls
            shrunk={shrunk}
            onToggleShrink={() => setShrunk((s) => !s)}
          />
          <button
            onClick={handlelogout}
            className="p-1 rounded-md hover:bg-gray-700"
            title="Logout"
          >
            <SquareArrowOutUpRight size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white flex flex-col items-center justify-center flex-grow p-8">
        <h1 className="text-3xl font-serif italic font-normal">
          Welcome back, {name}
        </h1>
        <p className="text-gray-500 mb-6">Quick access</p>

        <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
          <div className="no-drag relative bg-white rounded-lg shadow-sm cursor-pointer overflow-hidden border-2 border-orange-300" style={{ minHeight: '80px' }}>
            {/* Blurred yellow gradient background */}
            <div className="absolute inset-0 rounded-lg" style={{ 
              background: 'linear-gradient(135deg, rgba(255, 242, 0, 0.6) 100%, rgba(255, 242, 0, 0.6) 10%)', 
              filter: 'blur(25px)' 
            }}></div>
            {/* Text content */}
            <div className="absolute bottom-3 left-3">
              <span className="text-sm font-bold text-black relative z-10">Open Overlay</span>
            </div>
          </div>
          {/* Settings Button - Custom Design with PNG Images */}
          <div className="no-drag relative bg-neutral-900 rounded-lg shadow-sm cursor-pointer overflow-hidden border-2 border-b-gray-800" style={{ minHeight: '80px' }}>
            {/* Settings Gear Icon */}
            <div className="absolute top-0 right-0 opacity-100">
              <img src={SettingsIcon} alt="Settings" className="w-16 h-16" />
            </div>
            {/* Inner Circle */}
            <div className="absolute top-0 right-0 opacity-100">
              <img src={CircleIcon} alt="Circle" className="w-8 h-8" />
            </div>
            <div className="absolute bottom-3 left-3">
              <span className="text-sm font-bold text-white">Settings</span>
            </div>
          </div>
                     {/* Integrations Button - New Design */}
           <div className="no-drag relative bg-white rounded-lg shadow-sm border-2 border-gray-200 cursor-pointer overflow-hidden" style={{ minHeight: '80px' }}>
            <div className="absolute top-0 right-0 opacity-100">
              <img src={IntegrationsIcon} alt="Integrations" className="w-full h-full" />
            </div>
            <div className="absolute bottom-3 left-3">
              <span className="text-sm font-bold text-black">Integrations</span>
            </div>
          </div>
          <div
            className="no-drag flex flex-col items-center justify-center p-4 rounded-lg shadow-sm cursor-pointer border-2 border-gray-200 bg-gray-100 text-black"
            onClick={() => navigate('/shortcuts')}
          >
            <Keyboard />
            <span className="mt-2 text-sm font-medium">Shortcuts</span>
          </div>
          <QuickAccessButton icon={<Brain />} label="Memory" />
          <QuickAccessButton icon={<MoreHorizontal />} label="Preferences" />
        </div>
      </div>
    </div>
  );
}