import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
import {
  Cog,
  GitFork,
  Keyboard,
  Brain,
  MoreHorizontal,
  SquareArrowOutUpRight,
} from "lucide-react";
import { launchMagicDotWindow } from "../magicDot/magicDotLauncher";

export default function Landing() {
  const { clearUser, name } = useUserStore();
  const navigate = useNavigate();
  launchMagicDotWindow();

  const handlelogout = () => {
    clearUser();
    invoke("close_magic_dot").catch(console.error);
    navigate("/");
  };

  const QuickAccessButton = ({ icon, label, bgColor = "bg-gray-100", textColor = "text-black" }: { icon: React.ReactNode; label: string; bgColor?: string; textColor?: string }) => (
    <div className={`no-drag flex flex-col items-center justify-center p-4 rounded-lg shadow-sm cursor-pointer ${bgColor} ${textColor}`}>
      {icon}
      <span className="mt-2 text-sm font-medium">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col rounded-md overflow-hidden text-black">
      {/* Black Title Bar */}
      <div className="drag flex items-center justify-between p-0 bg-black text-white rounded-t-md">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
          <span className="font-semibold">Quack</span>
        </div>
        <button
          onClick={handlelogout}
          className="no-drag p-1 rounded-md hover:bg-gray-700"
          title="Logout"
        >
          <SquareArrowOutUpRight size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white flex flex-col items-center justify-center flex-grow p-8 rounded-b-md">
        <h1 className="text-3xl font-serif italic font-normal">Welcome back, {name}</h1>
        <p className="text-gray-500 mb-6">Quick access</p>

        <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
          <div className="no-drag flex flex-col items-center justify-center p-4 rounded-lg shadow-sm cursor-pointer bg-yellow-200 text-black">
            <span className="font-medium">Open Overlay</span>
          </div>
          <QuickAccessButton icon={<Cog />} label="Settings" bgColor="bg-black" textColor="text-white" />
          <QuickAccessButton icon={<GitFork />} label="Integrations" />
          <QuickAccessButton icon={<Keyboard />} label="Shortcuts" />
          <QuickAccessButton icon={<Brain />} label="Memory" />
          <QuickAccessButton icon={<MoreHorizontal />} label="Preferences" />
        </div>
      </div>
    </div>
  );
}