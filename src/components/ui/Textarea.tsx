import React, { InputHTMLAttributes, TextareaHTMLAttributes, useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import autosize from "autosize"

interface TextareaProps extends TextareaHTMLAttributes<HTMLInputElement> {
    
} 

const Textarea = ({placeholder,...props}: TextareaProps) => {
    const areaRef = useRef();
    useEffect(() => {
        if(areaRef.current){
            autosize(areaRef.current)
        }
    }, [])
  return (
    <textarea
        ref={areaRef}
      placeholder={placeholder}
      className={twMerge("w-full !max-h-[200px] resize-none overflow-hidden px-4 py-2 text-base font-medium border focus:border-foreground/40 transition-colors outline-none rounded-lg border-border", props.className)}
    ></textarea>
  );
};

export default Textarea;
