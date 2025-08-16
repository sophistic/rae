{
  /*
  This is the auth api.
  It is used to sign up and login.
  It is also used to get the user's data.
*/
}

import axios from "axios";

const BASE_URL = "https://quackback-xwhd.onrender.com/api/auth";
// const BASE_URL = "http://localhost:8000/api/auth";
export const SignUp = async (
  email: string,
  password: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await axios.post(`${BASE_URL}/signup`, { email, password });

    return {
      success: res.status === 201,
      message: res.data.message || "Signup successful.",
    };
  } catch (err: any) {
    const message =
      err.response?.data?.message ||
      err.message ||
      "Signup failed. Try again later.";
    return {
      success: false,
      message,
    };
  }
};

export const Login = async (
  email: string,
  password: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await axios.post(`${BASE_URL}/login`, { email, password });

    return {
      success: res.status === 200,
      message: res.data.message || "Login successful.",
    };
  } catch (err: any) {
    const message =
      err.response?.data?.message ||
      err.message ||
      "Login failed. Try again later.";
    return {
      success: false,
      message,
    };
  }
};
