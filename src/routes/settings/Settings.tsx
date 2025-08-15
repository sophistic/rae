
import { useNavigate } from "react-router-dom";
import { Keyboard, Wrench } from "lucide-react";
import React from "react";
import QuickAccessCard from "@/components/ui/QuickAccessCard";



const SettingsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="size-full grid grid-cols-3 gap-1 p-1">
      <QuickAccessCard
        icon={<Wrench className="rotate-180" />}
        label="Preferences"
        onClick={() => navigate("/app/settings/preferences")}
      />
      <QuickAccessCard
        icon={<Keyboard />}
        label="Shortcuts"
        onClick={() => navigate("/app/settings/shortcuts")}
      />
    </div>
  );
};

export default SettingsPage;