import React, { InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    
} 

const Input = ({placeholder,...props}: InputProps) => {
  return (
    <input
      placeholder={placeholder}
      className={twMerge("w-full  px-4 py-2 text-base font-medium border focus:border-foreground/40 transition-colors outline-none rounded-lg border-border", props.className)}
    ></input>
  );
};

export default Input;
