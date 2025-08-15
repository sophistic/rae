import {
  Home,
  KeyboardIcon,
  LogOut,
  MessageSquare,
  Settings,
  Settings2,
  User,
  User2,
} from "lucide-react";
import React, { ReactNode, useEffect, useState } from "react";
import Button from "./ui/Button";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserStore } from "@/store/userStore";
import { invoke } from "@tauri-apps/api/core";
import { isRegistered, unregister } from "@tauri-apps/plugin-global-shortcut";
import { MAGIC_DOT_TOGGLE_COMBO } from "@/constants/shortcuts";
import { motion } from "motion/react";

const SidebarButton = ({
  children,
  to,
}: {
  children: ReactNode;
  to: string;
}) => {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    console.log("Checking active for", to, "current path:", location.pathname.split("/")[2]);
    if (location.pathname.split("/")[2] == to) {
      console.log("Setting active for", to);
      //   setLoading(false);
      setActive(true);
    } else {
      setActive(false);
    }
  }, [location]);
  const navigate = useNavigate();
  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        setLoading(true);
        navigate(`/app/${to}`);
      }}
      className="px-[4px] py-[2px] group text-foreground"
    >
      <motion.button
        className={`flex rounded-md size-[42px]  relative  items-center justify-center  shrink-0 overflow-visible ${
          loading ? "bg-border" : "bg-background group-hover:bg-border"
        }`}
      >
        <motion.div
          // initial={{ scale: 0 }}
          animate={{
            width: active ? "42px" : "0px",
            height: active ? "42px" : "0px",
            borderRadius: active ? "8px" : "16px",
            borderColor: active ? "black" : "transparent",
          }}
          onAnimationComplete={() => {
            setLoading(false);
          }}
          transition={{
            ease: "backInOut",
            duration: 0.3,
            
          }}
          className="absolute pointer-events-none shadow-[inset_0_-4px_4px_rgba(0,0,0,0.07),inset_0_4px_4px_rgba(255,255,255,0.25)] overflow-hidden flex items-center justify-center bg-surface rounded-md text-background"
        >
          {children}
        </motion.div>
        {children}
      </motion.button>
    </motion.div>
  );
};

const Sidebar = () => {
  const navigate = useNavigate();
  const { clearUser } = useUserStore();
  const handlelogout = async () => {
    clearUser();
    // Disable magic dot creation and close any existing one
    invoke("set_magic_dot_creation_enabled", { enabled: false }).catch(
      console.error,
    );
    invoke("close_magic_dot").catch(console.error);

    // Unregister the global shortcut to prevent toggling after logout
    try {
      if (await isRegistered(MAGIC_DOT_TOGGLE_COMBO)) {
        await unregister(MAGIC_DOT_TOGGLE_COMBO);
      }
    } catch (e) {
      console.warn("Failed to unregister global shortcut on logout", e);
    }
    navigate("/");
  };
  return (
    <div className="w-fit bg-background  py-[2px] shrink-0 h-full border-r border-border flex flex-col overflow-y-auto ">
      <SidebarButton to="landing">
        <Home size={16} />
      </SidebarButton>
      <SidebarButton to="chat">
        <MessageSquare size={16} />
      </SidebarButton>
      {/* <SidebarButton to="settings/shortcuts">
        <KeyboardIcon size={16} />
      </SidebarButton> */}
      <SidebarButton to="settings">
        <Settings size={16} />
      </SidebarButton>
      <div className="mt-auto flex flex-col gap-1 p-1">
        <button className="flex rounded-md w-full text-foreground hover:bg-border items-center justify-center aspect-square shrink-0">
          <User size={16} />
        </button>
        <motion.button whileTap={{ scale: 0.9 }} className="flex text-foreground rounded-md w-full hover:bg-border items-center justify-center aspect-square shrink-0">
          <LogOut size={16} onClick={handlelogout} />
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;
