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
    <div className="drag rounded-md min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl">
        <h1 className="text-center text-4xl font-serif mb-8">
          {isLogin ? "Login" : "Create an account"}
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="no-drag w-full mb-4 px-4 py-3 border rounded-lg bg-gray-100 text-sm"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="no-drag w-full mb-4 px-4 py-3 border rounded-lg bg-gray-100 text-sm"
        />

        {!isLogin && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="no-drag w-full mb-4 px-4 py-3 border rounded-lg bg-gray-100 text-sm"
          />
        )}

        <button
          onClick={handleSubmit}
          className="no-drag w-full mb-2 py-3 rounded-full bg-black text-white font-medium"
        >
          Continue
        </button>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="no-drag w-full py-3 rounded-full bg-gray-200 text-black font-medium"
        >
          {isLogin ? "Don't have an account?" : "Already have an account?"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
