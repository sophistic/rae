import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import React from "react";
import { Route } from "react-router-dom";
import Landing from "./landing/page";
import ChatWindow from "./magic-chat/page";
import MainApp from "../MainApp";
import Preferences from "../settings/preferences/page";
import ShortcutsPage from "../settings/shortcuts/page";

const Application = () => {
  return (
    
        <Route path="/app" element={<MainApp />}>
          <Route path="landing" element={<Landing />} />
          <Route path="chat" element={<ChatWindow />} />
          <Route path="shortcuts" element={<ShortcutsPage />} />
          <Route path="settings" element={<Settings />}>
            <Route path="shortcuts" element={<ShortcutsPage />} />
            <Route path="preferences" element={<Preferences />} />
          </Route>
        </Route>
      
  );
};

export default Application;
