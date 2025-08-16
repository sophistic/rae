import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AgentCard = ({ title, description, logo }) => {
  const navigate = useNavigate()
  return (
    <motion.div
      onClick={() => navigate("/app/agents/1")}
      whileTap={{ scale: 0.98 }}
      whileHover={"hover"}
      className="w-full h-fit items-stretch rounded-lg border-2 border-border hover:bg-foreground/10 shadow-[inset_0_-4px_4px_rgba(0,0,0,0.07),inset_0_4px_4px_rgba(255,255,255,0.05)] transition-colors text-foreground bg-background flex"
    >
      <motion.div
        variants={{
          hover: {
            scale: 1,
            rotateZ: "-10deg",
          },
        }}
        initial={{ scale: 0.8, rotateZ: "0deg" }}
        className="text-[7vw] "
      >
        {logo}
      </motion.div>
      <div className="flex flex-col justify-evenly p-2">
        <div className="text-base font-semibold leading-5">{title}</div>
        <div className="text-sm font-medium text-foreground/80">{description}</div>
      </div>
    </motion.div>
  );
};

// EmojiButton component for emoji selection
const EmojiButton = () => {
  const [showPicker, setShowPicker] = useState(false);
  const [emoji, setEmoji] = useState("😀");
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  return (
    <div className="relative">
      <button
        type="button"
        className="aspect-square h-full border border-border rounded-lg shrink-0 relative text-2xl flex hover:bg-foreground/10 items-center justify-center"
        onClick={() => setShowPicker((v) => !v)}
      >
        <span>{emoji}</span>
      </button>
      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute z-50 top-full left-0 mt-2 shadow-lg"
        >
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={(data: any) => {
              setEmoji(data.emoji);
              setShowPicker(false);
            }}
            searchDisabled={false}
            skinTonesDisabled={true}
            autoFocusSearch
            width={320}
            height={400}
          />
        </div>
      )}
    </div>
  );
};
const Agents = () => {
  const [opened, setOpened] = useState(false);
  return (
    <div className="size-full overflow-y-auto px-5 py-3.5 bg-background text-foreground flex flex-col">
      <div className="flex flex-col w-full">
        <div className="text-2xl font-medium leading">Agents</div>
        <div className="text-base text-foreground/40 ">
          Agents have predefined instructions and goals
        </div>
      </div>
      <Button
        onClick={() => setOpened(true)}
        className="w-full mt-4 mb-2 p-2 px-4 bg-[#222222] flex items-center gap-2 !text-white dark:hover:!text-black !transition-none"
      >
        <Plus size={16}></Plus> Create new agent
      </Button>
      <div className="size-full flex flex-col gap-2">
        <AgentCard
          title="Lund"
          description="lund agent"
          logo={"😹"}
        ></AgentCard>
        <AgentCard
          title="Hmm"
          description="hmm this agent is a agent"
          logo={"😭"}
        ></AgentCard>
        <AgentCard
          title="Agent 3"
          description="Agent 3 description"
          logo={"😗"}
        ></AgentCard>
      </div>

      <AnimatePresence>
        {opened && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ pointerEvents: "none", opacity: 0 }}
              onClick={() => setOpened(false)}
              className={`absolute left-0 rounded-lg top-0 bg-black/30 z-50 size-full ${
                opened ? "" : "pointer-events-none"
              }`}
            ></motion.div>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{
                type: "tween",
                duration: 0.3,
                ease: "circInOut",
              }}
              className="absolute min-h-[50vh] max-h-[calc(100vh-50px)] overflow-y-auto  h-fit bg-background z-[1000] border-t border-border bottom-0 left-0 w-full px-5 py-3 flex flex-col "
            >
              <div className="flex justify-between items-center h-[40px] w-full   ">
                <div className="text-lg font-medium">Enter agent details</div>
                <Button
                  onClick={() => setOpened(false)}
                  variant="outline"
                  className="aspect-square size-[40px] p-0 flex items-center justify-center shrink-0"
                >
                  <X size={16}></X>
                </Button>
              </div>
              <div className="w-full flex flex-col grow mt-4 gap-2">
                <div className="items-stretch w-full flex gap-4">
                  <EmojiButton />
                  <Input placeholder="Agent name"></Input>
                </div>
                <Input placeholder="Agent description"></Input>
                <Textarea placeholder="Prompt for agent"></Textarea>

                <Button className="w-full gap-2 mt-auto mb-2 p-2 px-4 bg-[#222222] flex items-center justify-start !text-white dark:hover:!text-black transition-none">
                  <Plus size={16}></Plus> Create
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Agents;
