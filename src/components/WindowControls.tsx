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
    <div className={`no-drag flex items-center gap-1 ${className ?? ""}`}>
      <button
        type="button"
        onClick={handleMinimize}
        title="Minimize"
        className="p-1 rounded-md hover:bg-gray-700 text-white"
      >
        <Minus size={18} />
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
        className="p-1 rounded-md hover:bg-red-600 text-white"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default WindowControls;


