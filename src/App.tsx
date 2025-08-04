// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./routes/landing/page";
import MagicDot from "./routes/magicDot/magicDot";
import Onboarding from "./routes/onboarding/OnBoardings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/magic-dot" element={<MagicDot />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
