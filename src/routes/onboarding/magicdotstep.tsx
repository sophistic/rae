import React, { useEffect, useState } from "react";
import { launchMagicDotWindow } from "../magicDot/magicDotLauncher";

const MagicDotStep: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createWindow = async () => {
      try {
        await launchMagicDotWindow();
        console.log("Magic dot window launched successfully");
      } catch (err) {
        console.error("Failed to launch magic dot window:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    createWindow();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-yellow-100 text-center px-4">
      <div>
        <h1 className="text-3xl font-serif mb-4">
          Welcome, say hello to our magic dot
        </h1>
        <p className="text-md">
          You should now see a floating yellow dot on your screen
          <br />
          Click on it to continue
          {error}
        </p>
      </div>
    </div>
  );
};

export default MagicDotStep;
