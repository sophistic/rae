import React, { ReactNode, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import { Keyboard, Search, Wrench } from "lucide-react";

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
        navigate(to);
      }}
      className="px-[4px] py-[2px] group w-fit overflow-visible"
    >
      <motion.button
        className={`flex rounded-md h-[42px] w-[180px]  relative  items-center justify-center  shrink-0 overflow-visible ${
          loading ? "bg-zinc-300" : "bg-white group-hover:bg-zinc-200"
        }`}
      >
        <motion.div
          initial={{
            width: "0px",
            height: "0px",
            borderRadius: "16px",
            borderColor: "transparent",
          }}
          // initial={{ scale: 0 }}
          animate={{
            width: active ? "180px" : "0px",
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
            height: {
                ease: "backInOut",
            duration: 0.2,
            }
          }}
          className="absolute pointer-events-none shadow-[inset_0_-4px_4px_rgba(0,0,0,0.07),inset_0_4px_4px_rgba(255,255,255,0.25)]  size-full  overflow-hidden flex items-center  bg-zinc-950 rounded-md text-white  gap-2 "
        >
          <motion.div
            transition={{ ease: "backInOut", duration: 0.3 }}
            animate={{ x: active ? "0%" : "-50%" }}
            className="h-[42px] absolute w-[180px] text-sm font-medium px-4 py-2 flex gap-2 items-center  "
          >
            {icon} {children}
          </motion.div>
        </motion.div>
        <div className="size-full px-4 py-2 flex gap-2 items-center font-medium text-sm">
          {icon} {children}
        </div>
      </motion.button>
    </motion.div>
  );
};

const SettingsSidebar = () => {
  return (
    <div className="h-full flex-col w-fit py-[2px] border-r border-zinc-300">
      <div className="min-w-0 w-[188px] py-[2px] px-[4px]">
        <div className="focus-within:!text-black text-zinc-500  border-zinc-300 rounded-md h-[42px] border focus-within:border-zinc-600 size-full relative flex items-center justify-center">
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
        icon={<Wrench size="16" />}
      >
        Preferences
      </SettingsButton>
      <SettingsButton
        to="/app/settings/shortcuts"
        icon={<Keyboard size="16" />}
      >
        Shortcuts
      </SettingsButton>
    </div>
  );
};

export default SettingsSidebar;
