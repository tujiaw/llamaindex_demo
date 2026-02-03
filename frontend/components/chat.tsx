"use client";

import { useState, useEffect, useRef } from "react";
import { Send, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
}

export function Chat({ files, selectedFileIds }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "你好！我可以帮你分析和理解上传的文档。\n\n请先在左侧添加来源，然后向我提问任何关于文档的问题。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 获取或创建用户ID
    let uid = localStorage.getItem("llamaindex_user_id");
    if (!uid) {
      uid = "user_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("llamaindex_user_id", uid);
    }
    setUserId(uid);
  }, []);

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
                      <Accordion type="single" collapsible className="w-full space-y-2">
                        {message.sources
                          .sort((a, b) => b.score - a.score)
                          .map((source, sidx) => (
                            <AccordionItem
                              key={sidx}
                              value={`source-${idx}-${sidx}`}
                              className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
                            >
                              <AccordionTrigger className="hover:no-underline px-4 py-2 text-left hover:bg-gray-100">
                                <div className="flex items-center justify-between w-full pr-4">
                                  <span className="text-xs font-medium text-gray-700">
                                    {source.filename}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {(source.score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="px-4 pb-3">
                                  <div className="bg-white p-3 rounded border-l-2 border-gray-900">
                                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                                      {source.text}
                                    </p>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                      </Accordion>
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
          
          {/* 底部提示文字 */}
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-400">
              RAG 系统提供的内容必经核实，因此请仔细查看回答内容。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
