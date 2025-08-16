import React from "react";
import { Minus, Minimize2, Maximize2, X } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

type WindowControlsProps = {
  shrunk: boolean;
  onToggleShrink: () => void;
  className?: string;
};

export const WindowControls: React.FC<WindowControlsProps> = ({
  shrunk,
  onToggleShrink,
  className,
}) => {
  const handleMinimize = async (): Promise<void> => {
    try {
      await getCurrentWebviewWindow().minimize();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to minimize window", error);
    }
  };

  return (
    <div className={`no-drag flex items-center gap-1 h-full ${className ?? ""}`}>
      <button
        type="button"
        onClick={handleMinimize}
        title="Minimize"
        className="h-full aspect-square shrink-0 flex items-center justify-center   hover:bg-foreground/10 text-foreground"
      >
        <Minus size={12} />
      </button>
      {/* <button
        type="button"
        onClick={onToggleShrink}
        title={shrunk ? "Expand" : "Shrink"}
        className="p-1 rounded-md hover:bg-gray-700 text-white"
      >
        {shrunk ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
      </button> */}
      <button
        type="button"
        onClick={async () => {
          try {
            await getCurrentWebviewWindow().close();
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Failed to close window", error);
          }
        }}
        title="Close"
        className="h-full aspect-square shrink-0 flex items-center justify-center  hover:bg-red-700 hover:text-white text-foreground"
      >
        <X size={12} />
      </button>
    </div>
  );
};

export default WindowControls;


