import WindowControls from "./WindowControls";

import { useLocation } from "react-router-dom";

import { useEffect, useState } from "react";

import logo from "../../assets/enhanced_logo.png";

export default function Titlebar() {
  
  const location = useLocation();
  const [shrunk, setShrunk] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState(true);

  useEffect(() => {
    // Check if there is something forward in the history
    // Browsers do not expose forward history, so we can only check if history.state.idx < history.length - 1 (for react-router v6+)
    // Fallback: disable if can't go forward (at the end of history)
    const updateCanGoForward = () => {
      // @ts-ignore
      const idx = window.history.state?.idx;
      setCanGoForward(typeof idx === 'number' ? idx < window.history.length - 1 : true);
    };
    updateCanGoForward();
    window.addEventListener('popstate', updateCanGoForward);
    return () => window.removeEventListener('popstate', updateCanGoForward);
  }, [location]);

  

  return (
    <div className="drag border-b  border-border shrink-0 z-[1000] flex h-[36px] items-center justify-between p-0 bg-background text-foreground">
      <div className="flex items-center gap-2 h-full ">
        {/* <button
          className={`rounded p-1 h-full ${location.pathname === "/app/landing" ? "bg-zinc-50 text-gray-500 cursor-not-allowed" : "hover:bg-zinc-200"}`}
          onClick={() => {
            if (location.pathname === "/app/landing") return;
            // Try to go back, but if no history, go to /app/landing
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/app/landing");
            }
          }}
          title="Back"
          disabled={location.pathname === "/app/landing"}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          className={`rounded p-1 ${!canGoForward ? "bg-zinc-50 text-gray-500 cursor-not-allowed" : "hover:bg-zinc-200"}`}
          onClick={() => canGoForward && navigate(1)}
          title="Forward"
          disabled={!canGoForward}
        >
          <ArrowRight size={18} />
        </button> */}
        <div className="h-full shrink-0 flex items-center justify-center relative ml-2" >
          <img src={logo} className="h-full aspect-square object-contain size-2/4" ></img>
        </div>
        <span className="font-semibold text-sm ">Rae</span>
      </div>
      <div className="no-drag flex items-center h-full ">
        
        <WindowControls shrunk={shrunk} onToggleShrink={() => setShrunk((s) => !s)} />
      </div>
    </div>
  );
}

