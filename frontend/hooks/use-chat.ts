import { useState, useCallback, useRef } from "react";

import { API_BASE_URL } from "@/lib/api-config";

export interface Source {
  filename: string;
  text: string;
  score: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  id?: string;
}

interface UseChatProps {
  userId: string;
}

export function useChat({ userId }: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好！我可以帮你分析和理解上传的文档。\n\n请先在左侧添加来源，然后向我提问任何关于文档的问题。",
      id: "init-1",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (input: string, fileIds: string[]) => {
      if (!input.trim() || isLoading) return;

      setIsLoading(true);
      const userMessage: Message = { 
        role: "user", 
        content: input,
        id: Date.now().toString() 
      };

      // Create a placeholder for the assistant's response
      const assistantMessageId = (Date.now() + 1).toString();
      
      setMessages((prev) => [
        ...prev,
        userMessage,
        { 
          role: "assistant", 
          content: "", 
          sources: [],
          id: assistantMessageId
        }
      ]);

      // Abort previous request if any (optional, but good practice)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(`${API_BASE_URL}/api/chat/query/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input,
            file_ids: fileIds.length > 0 ? fileIds : null,
            user_id: userId,
            chat_history: [], // Backend uses Mem0, so this might be ignored but good to keep consistent
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) throw new Error("请求失败");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) throw new Error("无法读取响应流");

        let buffer = "";
        let currentContent = "";
        let currentSources: Source[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;

            try {
              const jsonStr = line.substring(6);
              const chunk = JSON.parse(jsonStr);

              if (chunk.type === "content") {
                currentContent += chunk.data.delta;
                setMessages((prev) => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: currentContent }
                      : msg
                  )
                );
              } else if (chunk.type === "sources") {
                currentSources = chunk.data.sources || [];
                setMessages((prev) => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, sources: currentSources }
                      : msg
                  )
                );
              } else if (chunk.type === "error") {
                throw new Error(chunk.data.message || "未知错误");
              }
            } catch (e) {
              console.error("Error parsing chunk", e);
            }
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        
        console.error("Chat error:", e);
        setMessages((prev) => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: msg.content + `\n\n[Error: ${e instanceof Error ? e.message : "未知错误"}]` }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [userId, isLoading]
  );

  return {
    messages,
    isLoading,
    sendMessage,
    setMessages
  };
}
