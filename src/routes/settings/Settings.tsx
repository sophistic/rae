import QuickAccessCard from "@/components/ui/QuickAccessCard";
import { Keyboard, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/store/userStore";
import ConnectX from "@/components/misc/ConnectX";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { email } = useUserStore();
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

      <ConnectX
        provider="notion" // or "google-drive" / "one-drive"
        email={email}
        redirectUrl="http://localhost:5174/#/app/landing" // where you want the user sent back
      />
    </div>
  );
};

export default SettingsPage;
