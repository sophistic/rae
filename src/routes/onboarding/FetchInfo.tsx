import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/store/userStore";
import { useEffect, useState } from "react";
import { fetchUserName } from "@/api/fetch";

export default function FetchInfo() {
  const navigate = useNavigate();
  const { setUser, email, setLoggedIn } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    const gettingUserInfo = async () => {
      const fetchedName = await fetchUserName(email);
      setUser({ name: fetchedName });
      setName(fetchedName);
      setLoggedIn(true);
      setLoading(false);
      setTimeout(() => {
        navigate("/app/landing");
      }, 1000); // wait 1 second before redirect
    };

    gettingUserInfo();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-100">
      <div className="text-center text-xl font-medium text-gray-800">
        {loading ? (
          <div>Setting up user...</div>
        ) : (
          <div>Welcome back, {name}</div>
        )}
      </div>
    </div>
  );
}
