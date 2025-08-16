
import QuickAccessCard from "@/components/ui/QuickAccessCard";
import { Keyboard, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";



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