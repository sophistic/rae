import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "filled" | "outline" | "text";

const variants: Record<Variant, string> = {
  filled:
    "bg-surface  dark:hover:bg-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 font-medium transition-colors duration-75",
  outline: "border-2 font-medium hover:bg-foreground/10 border-border",
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
      // whileTap={{ scale: 0.9 }}
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
