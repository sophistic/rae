import React, { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import Welcome from "./welcomestep";
import Auth from "./authstep";
import Name from "./namestep";
import MagicDotStep from "./magicdotstep";
import FinishStep from "./finishStep";

const Onboarding: React.FC = () => {
  const [step, setStep] = useState<string>("welcome");

  useEffect(() => {
    const unlisten = listen("onboarding_done", () => {
      setStep("finish");
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
  return (
    <div className="overflow-hidden">
      {step === "welcome" && <Welcome onNext={setStep} />}
      {step === "auth" && <Auth onNext={setStep} />}
      {step === "name" && <Name onNext={setStep} />}
      {step === "magic_dot" && <MagicDotStep />}
      {step === "finish" && <FinishStep />}
    </div>
  );
};

export default Onboarding;
