import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, MessageSquare, Settings, Send } from "lucide-react";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'settings'>('chat');
  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    invoke("stick_chat_to_dot").catch(console.error);

    const unlisten = listen<ChatMessage>("new_message", (event) => {
      setMessages((prev) => [...prev, event.payload]);
      setVisible(true);
      // Keep compact view - don't auto-expand
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const newMessage: ChatMessage = {
      sender: "user",
      text: inputText.trim()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputText("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        sender: "ai",
        text: "This is a placeholder AI response."
      }]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!visible) return null;

  return (
    <div className="w-full h-full bg-transparent">
      {/* Compact chat view only */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y:0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="drag bg-white rounded-xl shadow-2xl border border-blue-400 overflow-hidden flex"
        style={{ width: '684px', height: '384px' }}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 flex items-center justify-between p-4 bg-gray-800 border-b border-gray-600 z-10" style={{ width: '684px' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-white text-sm font-medium">QuackQuery</span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-20 bg-gray-50 flex flex-col items-center py-6 space-y-3" style={{ marginTop: '48px' }}>
          {/* Arrow Button - No longer functional */}
          <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
            <span className="text-black text-lg font-bold">↗</span>
          </div>
          
          {/* Home Button */}
          <button 
            onClick={() => setActiveTab('home')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors no-drag ${
              activeTab === 'home' 
                ? 'bg-white border-2 border-gray-300' 
                : 'bg-white border border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Home className="w-5 h-5 text-gray-600" />
          </button>
          
          {/* Chat Button - Active */}
          <button 
            onClick={() => setActiveTab('chat')}
            className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center no-drag"
          >
            <MessageSquare className="w-5 h-5 text-black" />
          </button>
          
          {/* Spacer */}
          <div className="flex-1"></div>
          
          {/* Settings Button */}
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors no-drag ${
              activeTab === 'settings' 
                ? 'bg-white border-2 border-gray-300' 
                : 'bg-white border border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white" style={{ marginTop: '48px' }}>
          {/* Chat Content Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-white">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: msg.sender === "user" ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-black text-white rounded-br-md"
                        : "bg-gray-200 text-gray-800 rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 border border-gray-200">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your message here"
                className="flex-1 bg-transparent text-gray-600 placeholder-gray-500 text-sm outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="bg-yellow-400 hover:bg-yellow-500 p-2 rounded-xl transition-colors shrink-0"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
