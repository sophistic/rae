{
  /*
  This is the sidebar component.
  It is used to display the sidebar.
*/
}
import {ChatIcon, GearSixIcon, HouseIcon, BrainIcon, SparkleIcon} from "@phosphor-icons/react"
import { MAGIC_DOT_TOGGLE_COMBO } from "@/constants/shortcuts";
import { useUserStore } from "@/store/userStore";
import { invoke } from "@tauri-apps/api/core";
import { isRegistered, unregister } from "@tauri-apps/plugin-global-shortcut";
import {
  Home,
  LogOut,
  MessageSquare,
  Brain,
  Settings,
  Sparkle,
  User,
 
  
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
    console.log(
      "Checking active for",
      to,
      "current path:",
      location.pathname.split("/")[2]
    );
    if (location.pathname.split("/")[2] == to) {
      console.log("Setting active for", to);
      setLoading(false);
      setActive(true);
    } else {
      setActive(false);
    }
  }, [location]);
  const navigate = useNavigate();
  return (
    <motion.div
      onClick={() => {
        setLoading(true);
        navigate(`/app/${to}`);
      }}
      className="px-[4px]   py-[2px] group text-foreground"
    >
      <motion.button
        className={`flex rounded-md size-[42px]  relative  items-center justify-center  shrink-0 overflow-hidden  border-transparent  ${active && "!border-surface/0"} ${
          loading ? "bg-border" : "bg-background group-hover:bg-border "
        }`}
      >
        <div className={`z-20 ${active ? "dark:text-white text-black" : "text-foreground/40 dark:group-hover:text-white transition-all group-hover:text-black"}`}>{children}</div>
        <AnimatePresence>
          {active && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{duration: 0.2}}
                className="z-10 size-full absolute left-0 top-0  dark:bg-zinc-800 bg-surface/60  flex items-center justify-center "
              >
               
              </motion.div>
            </>
          )}
        </AnimatePresence>
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
      console.error
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
    <div className="w-fit bg-background  py-[2px] shrink-0 h-full  flex flex-col overflow-y-auto ">
      <SidebarButton to="landing">
        <HouseIcon weight="bold" />
      </SidebarButton>
      <SidebarButton to="chat">
        <ChatIcon weight="bold"  />
      </SidebarButton>
      {/* <SidebarButton to="agents">
        <SparkleIcon weight="bold"  />
      </SidebarButton> */}
      <SidebarButton to="brain">
        <BrainIcon weight="bold" />
      </SidebarButton>
      <SidebarButton to="settings">
        <GearSixIcon weight="bold" />
      </SidebarButton>
      <div className="mt-auto flex flex-col gap-1 p-1">
        <button className="flex rounded-md w-full text-foreground hover:bg-border items-center justify-center aspect-square shrink-0">
          <User size={16} />
        </button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex text-foreground rounded-md w-full hover:bg-border items-center justify-center aspect-square shrink-0"
        >
          <LogOut size={16} onClick={handlelogout} />
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;
