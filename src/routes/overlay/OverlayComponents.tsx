import React from "react";

export interface OverlayButtonProps {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
  customBgColor?: string; // Optional custom background color
}

export const OverlayButton = ({
  onClick,
  active = false,
  title,
  children,
  className = "",
  customBgColor = "",
}: OverlayButtonProps) => (
  <button
    onClick={onClick}
    className={`drag h-full hover:bg-gray-300 flex items-center justify-center aspect-square shrink-0 border-r border-gray-300 ${
      active ? `bg-gray-200` : ""
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

