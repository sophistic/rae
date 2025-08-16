import { Outlet } from "react-router-dom";
import SettingsSidebar from "./SettingsSidebar";

const Settings = () => {
  
  return (
    <div className="size-full flex ">
      <SettingsSidebar />
      <Outlet></Outlet>
    </div>
  );
};

export { Settings };

