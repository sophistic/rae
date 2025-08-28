import Button from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { FileText, Loader2, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode } from "react";
import { useNoteStore } from "@/store/noteStore";
import { GetNotes, updateUserNotes } from "@/api/notes";
import { useUserStore } from "@/store/userStore";
const Note = ({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) => {
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
          onClick={onDelete}
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
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newNote, setNewNote] = useState<string>("");
  const { notes, setNotes, updateNotes } = useNoteStore();
  const { email } = useUserStore();
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const res = await GetNotes({ email });
        setNotes(res);
      } catch (err: any) {
        console.error("notes fetching me err agaya bhaijan", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      console.log("Button pressed");
      setCreateLoading(true);
      const updated = [...notes, newNote];

      await updateNotes(email, updated);
    } catch (err: any) {
      console.error("Note updating me bakchodi", err);
    } finally {
      setNewNote("");
      setCreateLoading(false);
    }
  };
  return (
    <div className="size-full overflow-y-auto px-5 py-3.5 bg-background text-foreground flex flex-col">
      <div className="flex flex-col w-full">
        <div className="text-2xl font-medium leading">Notes</div>
        <div className="text-base text-foreground/40 ">
          Here's the stuff you'd want rae to remember
        </div>
      </div>
      <Button
        onClick={() => setOpened(true)}
        className="w-full mt-4 mb-2 p-2 px-4 bg-[#222222] flex items-center gap-2 !text-white dark:hover:!text-black !transition-none"
      >
        <Plus size={16}></Plus> Add new note
      </Button>
      {loading == true ? (
        <Loader2 className="mx-auto animate-spin duration-300" size={24} />
      ) : (
        <div className="h-fit  rounded-lg border border-border flex flex-col divide-border divide-y overflow-hidden  !text-sm">
          {notes.map((eachNote, idx) => {
            return (
              <Note
                key={idx}
                onDelete={() => {
                  const updated = notes.filter((_, i) => i !== idx);
                  updateNotes(email, updated); // store update
                  setNotes(updated); // local update
                }}
              >
                {eachNote}
              </Note>
            );
          })}
        </div>
      )}

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
                  value={newNote}
                  onChange={(e) => {
                    setNewNote(e.target.value);
                  }}
                  className="w-full  px-4 py-2 text-base font-medium border focus:border-foreground/40 transition-colors outline-none rounded-lg border-border"
                ></input>
                <div className="w-full justify-center py-4 flex gap-4 items-center text-sm text-foreground/30">
                  <div className="h-1 w-1/2  border-t-2 border-foreground/20 border-dashed "></div>
                  OR
                  <div className="h-1 w-1/2  border-t-2 border-foreground/20 border-dashed "></div>
                </div>
                <Button className="w-full gap-2 p-2 px-4 bg-[#222222] flex items-center justify-start !text-white dark:hover:!text-black transition-none">
                  <FileText size={16}></FileText> Upload file or image DOESNT
                  WORK SOMEONE ELSE ADD PLEASE
                </Button>
                <Button
                  onClick={handleAddNote}
                  className="w-full gap-2 mt-auto mb-2 p-2 px-4 bg-[#222222] flex items-center justify-start !text-white dark:hover:!text-black transition-none"
                >
                  {createLoading == true ? (
                    <Loader2
                      className="mx-auto animate-spin duration-300"
                      size={24}
                    />
                  ) : (
                    <>
                      <Plus size={16}></Plus> Create{" "}
                    </>
                  )}
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
