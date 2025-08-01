import React, { useState } from "react";
import { Login, SignUp } from "@/api/auth";
import { useUserStore } from "@/store/userStore";
import { loginSchema, signupSchema } from "@/utils/authSchema";
import { Loader } from "lucide-react";
const Auth: React.FC<{ onNext: (step: string) => void }> = ({ onNext }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useUserStore();

  const validateForm = (): boolean => {
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, confirmPassword });
      }
      return true;
    } catch (err: any) {
      if (err?.issues?.length > 0) {
        setError(err.issues[0].message); // Show the first validation error
      } else {
        setError("Validation failed");
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!validateForm()) return;
    setLoading(true);

    try {
      const result = isLogin
        ? await Login(email, password)
        : await SignUp(email, password);

      if (!result.success) {
        setError(result.message);
        return;
      }
      console.log("API result:", result);
      setUser({ email });
      onNext("name");
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
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

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          className="no-drag w-full flex justify-center items-center mb-2 py-3 rounded-full bg-black text-white font-medium cursor-pointer hover:scale-105 transition-all duration-300"
        >
          {loading ? <Loader className="animate-spin" /> : "Continue"}
        </button>

        <button
          onClick={() => {
            setError("");
            setIsLogin(!isLogin);
          }}
          className="no-drag w-full py-3 rounded-full bg-gray-200 text-black font-medium cursor-pointer hover:scale-105 transition-all duration-300"
        >
          {isLogin ? "Don't have an account?" : "Already have an account?"}
        </button>
      </div>
    </div>
  );
};

export default Auth;
