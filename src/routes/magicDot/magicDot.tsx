import React from "react";

const MagicDot: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="w-12 h-12 rounded-full bg-yellow-400 border-white border-2 shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200 animate-pulse"
        onClick={onClick}
        style={{
          // Ensure the dot is visible even with transparency
          backgroundColor: "#fbbf24",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        }}
      />
    </div>
  );
};

export default MagicDot;
