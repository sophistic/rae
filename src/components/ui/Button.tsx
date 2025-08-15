import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "filled" | "outline" | "text";

const variants: Record<Variant, string> = {
  filled:
    "bg-surface hover:bg-[#292929FF]  text-white font-medium shadow-[inset_0_-4px_4px_rgba(0,0,0,0.07),inset_0_4px_4px_rgba(255,255,255,0.25)] dark:shadow-[inset_0_-4px_4px_rgba(0,0,0,0.07),inset_0_4px_4px_rgba(255,255,255,0.1)]",
  outline: "border-2 font-medium hover:bg-zinc-200 border-zinc-600",
  text: "",
};

// Extend button props for proper typing, including className
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const Button = ({
  variant = "filled",
  children,
  className,
  onClick,
  ...props
}: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      {...props}
      className={twMerge(
        `${variants[variant]} px-4 py-2  !cursor-pointer rounded-lg transition-colors`,
        className
      )}
    >
      {children}
    </button>
  );
};

export default Button;
