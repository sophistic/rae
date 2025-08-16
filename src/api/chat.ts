{
  /*
  This is the chat api.
  It is used to generate messages and get conversations.
*/
}

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
      err.response?.data || "Response Generation Failed. Try again later.";
    return {
      success: false,
      message,
    };
  }
};

export const GetConvos = async ({ email }): Promise<any> => {
  try {
    const res = await axios.post(`${BASE_URL}/conversations/title`, {
      email,
    });
    const formatted = res.data.map((c: any) => ({
      id: c.id,
      title: c.title,
      messages: [], // always start blank
    }));
    console.log(formatted);
    return {
      success: true,
      data: formatted,
    };
  } catch (err: any) {
    const message =
      err.response?.data || "Convo fetching failed. Try again later.";
    return {
      success: false,
      message,
    };
  }
};

export const getConvoMessage = async ({ convoId }): Promise<any> => {
  try {
    const res = await axios.post(`${BASE_URL}/conversations/messages`, {
      conversationId: convoId,
    });
    const formatted = res.data.map((c: any) => ({
      id: c.id,
      title: c.title,
      messages: [], // always start blank
    }));
    console.log(formatted);
    return {
      success: true,
      data: res.data,
    };
  } catch (err: any) {
    const message =
      err.response?.data || "Message Fetching Failed. Try again later.";
    return {
      success: false,
      message,
    };
  }
};
