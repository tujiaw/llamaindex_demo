import { BookOpen } from "lucide-react";
import { Message, Source } from "@/hooks/use-chat";
import { MemoizedReactMarkdown } from "./markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ChatMessageProps {
  message: Message;
  onSourceClick: (source: Source) => void;
}

export function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${message.role === "user" ? "ml-auto" : "mr-auto"}`}>
        <div
          className={`rounded-2xl p-4 ${
            message.role === "user"
              ? "bg-blue-50 border border-blue-100"
              : "bg-white border border-gray-200"
          }`}
        >
          {/* User/Bot Icon & Name (Optional, but nice) */}
          {/* 
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100/50">
             {message.role === 'user' ? <User className="w-4 h-4"/> : <Bot className="w-4 h-4"/>}
             <span className="text-xs font-semibold">{message.role === 'user' ? 'You' : 'AI'}</span>
          </div> 
          */}

          <div className="prose prose-sm max-w-none dark:prose-invert">
            {message.role === "assistant" && message.content.length === 0 ? (
              <div className="flex gap-1.5 py-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              <MemoizedReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: { inline?: boolean, className?: string, children?: React.ReactNode, [key: string]: any }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Custom link renderer to open in new tab
                  a: ({ ...props }) => (
                    <a target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                }}
              >
                {message.content}
              </MemoizedReactMarkdown>
            )}
          </div>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{message.sources.length} 个来源</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {message.sources
                  .sort((a, b) => b.score - a.score)
                  .map((source, sidx) => (
                    <button
                      key={sidx}
                      onClick={() => onSourceClick(source)}
                      className="w-full border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[200px]">
                          {source.filename}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">
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
  );
}
