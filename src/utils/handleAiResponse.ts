import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { Generate } from "@/api/chat";
export const handleAiResponse = async ({
  message,
  provider,
  modelName,
  conversationId,
}) => {
  const { email } = useUserStore();
  const { messages, setMessages } = useChatStore();
  const newMessages = [
    ...messages,
    {
      sender: "user" as const,
      text: message,
    },
  ];
  setMessages(newMessages); //adds user message
  const response = await Generate({
    email: email,
    message: message,
    newConvo: conversationId == -1 ? true : false,
    conversationId: conversationId,
    provider: provider,
    modelName: modelName,
    messageHistory: messages,
    notes: [],
    agentId: 0,
    agentContext: "",
  });
  // setMessages ai response
  // set a converstationId
  // set a conversation Title
};
