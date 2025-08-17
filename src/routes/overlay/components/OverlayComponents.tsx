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
    className={`${
      draggable ? "drag" : ""
    } h-full bg-transparent hover:bg-foreground/10 flex items-center justify-center aspect-square shrink-0 border-l border-border transition-all duration-150 first:rounded-l-[12px] last:rounded-r-[12px]  ${
      active ? `bg-foreground/20  text-surface rounded-lg` : ""
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
