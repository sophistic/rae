import Button from "@/components/ui/Button";
import { FileText, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useState } from "react";

const Note = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <motion.div
        whileHover="hover"
        className="px-4 text-base group py-2 flex w-full relative flex-col"
      >
        {children}
        <motion.div
          initial="initial"
          variants={{
            hover: {
              scale: 1,
            },
            initial: {
              scale: 1,
            },
          }}
          className="h-full bg-foreground/5 text-foreground  flex items-center justify-center hover:bg-red-400/30 top-0 right-0 aspect-square shrink-0  absolute"
        >
          <Trash2 size={16} />
        </motion.div>
      </motion.div>
    </>
  );
};

const Notes = () => {
  const [opened, setOpened] = useState(false);
  return (
    <div className="size-full overflow-y-auto px-5 py-3.5 bg-background text-foreground flex flex-col">
      <div className="flex flex-col w-full">
        <div className="text-2xl font-medium leading">Notes</div>
        <div className="text-base text-foreground/40 ">
          Here's the stuff you'd want quack to remember
        </div>
      </div>
      <Button
        onClick={() => setOpened(true)}
        className="w-full mt-4 mb-2 p-2 px-4 bg-[#222222] flex items-center gap-2 !text-white dark:hover:!text-black !transition-none"
      >
        <Plus size={16}></Plus> Add new note
      </Button>
      <div className="h-fit  rounded-lg border border-border flex flex-col divide-border divide-y overflow-hidden  !text-sm">
        <Note>Your name is ronish rohan</Note>
        <Note>You live in bengaluru</Note>
        <Note>Youre building quack</Note>
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
              className="absolute min-h-[50vh]   h-fit bg-background z-[1000] border-t border-border bottom-0 left-0 w-full px-5 py-3 flex flex-col "
            >
              <div className="flex justify-between items-center h-[40px] w-full   ">
                <div className="text-lg font-medium">Add note</div>
                <Button
                  onClick={() => setOpened(false)}
                  variant="outline"
                  className="aspect-square size-[40px] p-0 flex items-center justify-center shrink-0"
                >
                  <X size={16}></X>
                </Button>
              </div>
              <div className="w-full flex flex-col grow mt-4 gap-2">
                <input
                  placeholder="Enter note here"
                  className="w-full  px-4 py-2 text-base font-medium border focus:border-foreground/40 transition-colors outline-none rounded-lg border-border"
                ></input>
                <div className="w-full justify-center py-4 flex gap-4 items-center text-sm text-foreground/30" >
                <div className="h-1 w-1/2  border-t-2 border-foreground/20 border-dashed " ></div>
                OR
                <div className="h-1 w-1/2  border-t-2 border-foreground/20 border-dashed " ></div>
                </div>
                <Button className="w-full gap-2 p-2 px-4 bg-[#222222] flex items-center justify-start !text-white dark:hover:!text-black transition-none">
                  <FileText size={16}></FileText> Upload file or image
                </Button>
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

export default Notes;
