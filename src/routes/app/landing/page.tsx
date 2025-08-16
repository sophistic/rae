import { useNavigate, useLocation } from "react-router-dom";
import {
  Keyboard,
  Settings,
  Sparkle,
  MessageSquareIcon,
  Wrench,
  NotepadText,
} from "lucide-react";
import { LaunchOverlayWindow } from "@/routes/overlay/components/OverlayLauncher";
import { useUserStore } from "@/store/userStore";
import { useState, useEffect } from "react";
import SplashScreen from "@/components/app/SplashScreen";
import QuickAccessCard from "@/components/ui/QuickAccessCard";
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

  

  const quickAccessButtons = [
    {
      label: "Open Chat",
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
      onClick: () => navigate("/app/integrations"),
    },
    {
      icon: <Keyboard />,
      label: "Shortcuts",
      onClick: () => navigate("/app/settings/shortcuts"),
    },
    {
      icon: <NotepadText />,
      onClick: () => navigate("/app/notes"),
      label: "Notes",
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
        className="h-full flex w-full flex-col items-center justify-center overflow-hidden text-foreground bg-background transition-transform duration-300 ease-in-out"
        style={{
          transform: `scale(${shrunk ? 0.9 : 1})`,
          transformOrigin: "top center",
        }}
      >
        <div className="bg-background w-full flex flex-col items-center justify-center flex-grow p-8">
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
                <QuickAccessCard {...props} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
