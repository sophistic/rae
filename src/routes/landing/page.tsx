import { launchMagicDotWindow } from "../magicDot/magicDotLauncher";
import { invoke } from "@tauri-apps/api/core";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
export default function Landing() {
  const { clearUser } = useUserStore();
  const navigate = useNavigate();
  launchMagicDotWindow();
  const handlelogout = () => {
    clearUser();
    console.log("is ts clicking");
    invoke("close_magic_dot").catch(console.error);
    navigate("/");
  };
  return (
    <div className="drag min-h-screen flex flex-col gap-4 items-center rounded-md justify-center bg-white">
      <div className="text-blacks">dummy text </div>
      <button
        onClick={() => handlelogout()}
        className="no-drag px-8 py-3 bg-black text-white rounded-full shadow-lg hover:scale-105 transition"
      >
        logout (temporary)
      </button>
    </div>
  );
}
