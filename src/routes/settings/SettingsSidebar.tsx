import { Keyboard, Search, Wrench } from "lucide-react";
import { motion } from "motion/react";
import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ConnectX from "@/components/misc/ConnectX";
import { useUserStore } from "@/store/userStore";
import { CommandIcon, WrenchIcon } from "@phosphor-icons/react";
const SettingsButton = ({
  children,
  icon,
  to,
}: {
  children: ReactNode;
  icon: ReactNode;
  to: string;
}) => {
  const location = useLocation();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    console.log("Checking active for", to, "current path:", location.pathname);
    if (location.pathname == to) {
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
        navigate(to);
        
      }}
      className="px-[4px] py-[2px] group w-fit overflow-visible"
    >
      <motion.button
        className={`flex rounded-md ${active ? "dark:bg-zinc-800 text-foreground" : "text-foreground/40 group-hover:bg-foreground/10"} h-[42px] w-[180px] text-foreground relative  items-center justify-center  shrink-0 overflow-visible transition-colors duration-75 ${
          loading
            ? "bg-foreground/10"
            : "bg-background "
        }`}
      >
        
        <div className="size-full px-4 group-hover:text-foreground py-2 flex gap-2 items-center  font-medium text-sm">
          {icon} {children}
        </div>
      </motion.button>
    </motion.div>
  );
};

const SettingsSidebar = () => {
  const { email } = useUserStore();
  return (
    <div className="h-full flex-col w-fit py-[2px]  bg-background ">
      <div className="min-w-0 w-[188px] py-[2px] px-[4px]">
        <div className="focus-within:!text-foreground text-zinc-500  border-border rounded-md h-[42px] border focus-within:border-zinc-600 size-full relative flex items-center justify-center">
          <div className="absolute left-0 ml-[14px] ">
            {" "}
            <Search size={16}></Search>
          </div>
          <input
            className="size-full min-w-0 outline-none border-none text-sm pl-[36px]"
            placeholder="Search"
          ></input>
        </div>
      </div>
      <SettingsButton
        to="/app/settings/preferences"
        icon={<WrenchIcon weight="bold" className="text-lg" />}
      >
        Preferences
      </SettingsButton>
      <SettingsButton
        to="/app/settings/shortcuts"
        icon={<CommandIcon className="text-lg" weight="bold" />}
      >
        Shortcuts
      </SettingsButton>
      

      {/*<ConnectX
        provider="notion" // or "google-drive" / "one-drive"
        email={email}
      />
      <ConnectX
        provider="one-drive" // or "google-drive" / "one-drive"
        email={email}
      />*/}
    </div>
  );
};

export default SettingsSidebar;
