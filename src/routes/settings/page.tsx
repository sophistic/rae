import React from "react";
import { AnimatePresence, motion } from "motion/react";
import SettingsSidebar from "./SettingsSidebar";
import { Outlet, useLocation } from "react-router-dom";

const Settings = () => {
  const location = useLocation();
  return (
    <div className="size-full flex ">
      <SettingsSidebar />
      <Outlet></Outlet>
    </div>
  );
};

export { Settings };
