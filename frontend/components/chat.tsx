"use client";

import { useState, useEffect, useRef } from "react";
import { Send, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileItem {
  file_id: string;
  filename: string;
}

interface Source {
  filename: string;
  text: string;
  score: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface ChatProps {
  files: FileItem[];
  selectedFileIds: Set<string>;
  onSourceClick: (source: Source) => void;
  userId: string;
}

export function Chat({ files, selectedFileIds, onSourceClick, userId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "你好！我可以帮你分析和理解上传的文档。\n\n请先在左侧添加来源，然后向我提问任何关于文档的问题。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    // 重置输入框高度
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = "auto";
    }

    try {
      const res = await fetch("/api/chat/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          file_ids: selectedFileIds.size > 0 ? Array.from(selectedFileIds) : null,
          user_id: userId,
          chat_history: [],
        }),
      });

      if (!res.ok) throw new Error("请求失败");

      const data = await res.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        sources: data.sources || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${e instanceof Error ? e.message : "未知错误"}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
            <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${message.role === "user" ? "ml-auto" : "mr-auto"}`}>
                {/* 消息气泡 */}
                <div className={`rounded-2xl p-4 ${
                  message.role === "user"
                    ? "bg-blue-50 border border-blue-100"
                    : "bg-white border border-gray-200"
                }`}>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-[15px] text-gray-800 leading-7 m-0">
                      {message.content}
                    </p>
                  </div>

                  {/* 源文档 */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{message.sources.length} 个来源</span>
                      </div>
                      <div className="space-y-2">
                        {message.sources
                          .sort((a, b) => b.score - a.score)
                          .map((source, sidx) => (
                            <button
                              key={sidx}
                              onClick={() => onSourceClick(source)}
                              className="w-full border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="px-4 py-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">
                                  {source.filename}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {(source.score * 100).toFixed(0)}%
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="rounded-2xl p-4 bg-white border border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            </div>
          )}
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
                onKeyPress={handleKeyPress}
                placeholder="开始输入..."
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm py-2 overflow-hidden"
                disabled={loading}
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
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    loading || !input.trim()
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
