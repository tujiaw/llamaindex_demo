"use client";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { useChat, Source } from "@/hooks/use-chat";

interface FileItem {
  file_id: string;
  filename: string;
}

interface ChatProps {
  files: FileItem[];
  selectedFileIds: Set<string>;
  onSourceClick: (source: Source) => void;
  userId: string;
}

export function Chat({ files, selectedFileIds, onSourceClick, userId }: ChatProps) {
  const { messages, isLoading, sendMessage } = useChat({ userId });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const currentInput = input;
    setInput("");
    
    // Reset height
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    if (textarea) {
        textarea.style.height = "auto";
        // Min height 24px + py-2 (8px * 2) = 40px roughly? 
        // Original style was minHeight: "24px" with py-2.
    }

    await sendMessage(currentInput, Array.from(selectedFileIds));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // 自动调整高度
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, idx) => (
            <ChatMessage 
              key={message.id || idx} 
              message={message} 
              onSourceClick={onSourceClick}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入框区域 */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="relative">
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-3xl px-4 py-2 focus-within:border-gray-400 transition-colors">
              <textarea
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyPress}
                placeholder="开始输入..."
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm py-2 overflow-hidden"
                disabled={isLoading}
                style={{ 
                  minHeight: "24px",
                  maxHeight: "120px"
                }}
              />
              
              {/* 右侧控制区 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* 来源数量 */}
                {selectedFileIds.size > 0 && (
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {selectedFileIds.size} 个来源
                  </div>
                )}
                
                {/* 发送按钮 */}
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isLoading || !input.trim()
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
