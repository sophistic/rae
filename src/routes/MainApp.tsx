

import { Outlet, useNavigate } from "react-router-dom";
import Titlebar from "@/components/Titlebar";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

export default function MainApp() {
  const navigate = useNavigate();

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ navigate?: boolean }>("quack:transfer-chat", (event) => {
      if (event?.payload?.navigate) {
        navigate("/app/chat");
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [navigate]);

  return (
    <div className="rounded-lg bg-white size-full overflow-hidden flex flex-col">
      <Titlebar />
      <Outlet />
    </div>
  );
}
