// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./routes/landing/page";
import MagicDot from "./routes/overlay/MagicDot";
import Onboarding from "./routes/onboarding/OnBoardings";
import ChatWindow from "./routes/magic-chat/page";
import ShortcutsPage from "./routes/shortcuts/page";
import MainApp from "./routes/MainApp";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/magic-dot" element={<MagicDot />} />
        <Route path="/shortcuts" element={<ShortcutsPage />} />
        <Route path="/app" element={<MainApp />}>
          <Route path="landing" element={<Landing />} />
          <Route path="chat" element={<ChatWindow />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
