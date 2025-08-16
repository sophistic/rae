import Button from "@/components/ui/Button";
import { ArrowLeft, MessageSquareMoreIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import {motion} from "motion/react"

const Agent = () => {
  const navigate = useNavigate();
  return (
    <div className="size-full overflow-y-auto px-5 py-3.5 bg-background text-foreground flex flex-col">
      <div className="flex mb-4 items-stretch gap-4">
        <Button
          onClick={() => navigate("/app/agents")}
          className="px-4 py-2 bg-background border border-border hover:!bg-foreground/10 gap-2 flex items-center justify-center !text-foreground/80"
        >
          <ArrowLeft size={16} /> Back
        </Button>
        <motion.div whileTap={{ scale: 0.9 }} className="">
          <Button
            onClick={() => navigate("/app/chat")}
            className="px-4 py-2 gap-2 flex items-center justify-center"
          >
            <MessageSquareMoreIcon size={16} /> Start a conversation
          </Button>
        </motion.div>
      </div>
      <div className="flex gap-4 items-stretch">
        <div className="aspect-square shrink-0 h-full text-[5vw] items-center justify-center flex">
          {"😇"}
        </div>
        <div className="flex flex-col">
          <div className="text-2xl font-medium">React expert</div>
          <div className="text-base text-foreground/40 ">
            I am an expert in React and Tauri app development
          </div>
        </div>
      </div>

      <div className="w-full border border-border p-4 text-sm font-dm-mono mt-6 font-bold rounded-lg bg-card">
        You are an expert software engineer specializing in Rust, React, and
        Tauri. Always provide working, production-ready code with clear
        explanations. If there are multiple solutions, explain the trade-offs.
        Keep answers concise, structured, and beginner-friendly where possible.
        When asked for examples, provide minimal reproducible snippets.
      </div>
    </div>
  );
};

export default Agent;
