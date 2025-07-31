import React, { useState } from "react";

interface AuthProps {
  onNext: (step: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onNext }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = () => {
    onNext("name");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-center text-2xl font-serif mb-6">
          {isLogin ? "Login to your account" : "Create an account"}
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-4 py-2 border rounded-md bg-gradient-to-b from-white to-gray-100"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 px-4 py-2 border rounded-md bg-gradient-to-b from-white to-gray-100"
        />

        {!isLogin && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full mb-3 px-4 py-2 border rounded-md bg-gradient-to-b from-white to-gray-100"
          />
        )}

        <button
          onClick={handleSubmit}
          className="w-full mb-2 py-2 rounded-md bg-green-700 text-white font-medium"
        >
          Continue
        </button>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full py-2 rounded-md bg-black text-white font-medium"
        >
          {isLogin ? "Don't have an account?" : "Already have an account?"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
