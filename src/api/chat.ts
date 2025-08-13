import axios from "axios";

const BASE_URL = "https://quackback-xwhd.onrender.com/api";

export const Generate = async ({
  email,
  message,
  newConvo,
  conversationId,
  provider,
  modelName,
  messageHistory,
  notes,
  agentId,
  agentContext,
}): Promise<any> => {
  try {
    const res = await axios.post(`${BASE_URL}/generate/msg`, {
      email,
      message,
      newConvo,
      conversationId,
      provider,
      modelName,
      messageHistory,
      notes,
      agentId,
      agentContext,
    });
    // console.log(res.data);
    return res.data;
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
