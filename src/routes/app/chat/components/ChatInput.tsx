import React, { useEffect, useRef, useState } from "react";
import autosize from "autosize";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import Button from "@/components/ui/Button";
import { AnimatePresence, motion } from "motion/react";

import { models } from "@/constants/models";

const ChatInput = () => {
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (chatInputRef.current) {
      autosize(chatInputRef.current);
    }
  }, []);
  const [message, setMessage] = useState("");
  const [disabled, setDisabled] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [model, setModel] = useState(models[0]);
  useEffect(() => {
    if (message.length > 0) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [message]);

  return (
    <div className="absolute bottom-0  h-fit  text-foreground w-full flex items-center justify-center z-50 p-1">
      <div className="bg-card w-full h-fit border flex flex-col transition-all rounded-lg border-border group focus-within:border-foreground/40 ">
        <textarea
          onChange={() => setMessage(chatInputRef.current?.value ?? "")}
          ref={chatInputRef}
          placeholder="Enter your message"
          name=""
          id=""
          className="size-full min-h-[60px] placeholder:text-foreground/40 resize-none outline-none text-sm p-2"
        ></textarea>
        <div className=" text-sm shrink-0 w-full flex h-[40px] p-1">
          <div className="h-full w-fit relative">
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: "0px" }}
                  animate={{height: models.length * 40 + "px"}}
                  exit={{ height: "0px" }}
                //   transition={{duration: 0.3, ease: "backInOut"}}
                  className="absolute bottom-full rounded-t-lg overflow-hidden   backdrop-blur-3xl bg-foreground/5 h-fit w-full flex flex-col"
                >
                  {models.map((model) => (
                    <>
                      <button
                        onClick={() => {
                            setModel(model);
                            setExpanded(false);
                        }}
                        className="h-[40px] hover:bg-foreground/10 shrink-0 px-4 flex items-center justify-start"
                      >
                        {model}
                      </button>
                    </>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div
              onClick={() => setExpanded(true)}
              className={`w-fit flex gap-2 ${
                expanded
                  ? "bg-foreground/5 border-t border-t-foreground/10 rounded-t-none "
                  : ""
              } border border-border h-full transition-all delay-75 rounded-lg px-4 py-2 hover:bg-foreground/5 items-center justify-center`}
            >
              {model}
              <ChevronDown
                className={`${expanded ? "rotate-180" : ""} transition-all`}
                size={12}
              ></ChevronDown>
            </div>
          </div>

          <motion.div
            initial={{}}
            whileTap={{ scale: disabled ? 1 : 0.9 }}
            className={`h-full ml-auto aspect-square  shrink-0 ${
              disabled ? "saturate-0 pointer-events-none" : ""
            } flex items-center justify-center `}
          >
            <Button
              disabled={disabled}
              className={`rounded-lg  size-full  p-0 flex items-center justify-center ${
                disabled && "!bg-foreground/5 !text-foreground/20"
              }`}
            >
              <Send size={14}></Send>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
