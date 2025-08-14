import React from "react";

export interface OverlayButtonProps {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
  customBgColor?: string; // Optional custom background color
  draggable?: boolean; // Whether the button should be draggable
}

export const OverlayButton = ({
  onClick,
  active = false,
  title,
  children,
  className = "",
  customBgColor = "",
  draggable = true,
}: OverlayButtonProps) => (
  <button
    onClick={onClick}
    className={`${draggable ? "drag" : ""} h-full hover:bg-gray-300 flex items-center justify-center aspect-square shrink-0 border-r border-gray-300 ${
      active ? `bg-blue-100 border-blue-300 text-blue-700` : ""
    } ${className}`}
    title={title}
  >
    {children}
  </button>
);

// Example usage (replace with your logic):
// <OverlayButton onClick={() => setMicOn(v => !v)} active={micOn} title="Voice">
//   <Mic size={16} />
// </OverlayButton>
