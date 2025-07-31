import React, { useState } from "react";
import Welcome from "./welcomestep";
import Auth from "./authstep";
import Name from "./namestep";
import MagicDotStep from "./magicdotstep";
const Onboarding: React.FC = () => {
  const [step, setStep] = useState<string>("welcome");

  return (
    <>
      {step == "welcome" && <Welcome onNext={setStep} />}
      {step == "auth" && <Auth onNext={setStep} />}
      {step == "name" && <Name onNext={setStep} />}
      {step == "magic_dot" && <MagicDotStep />}
    </>
  );
};

export default Onboarding;
