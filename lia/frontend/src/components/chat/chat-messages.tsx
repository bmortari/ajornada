"use client";

import type { ChatMessage } from "@/types";
import { Bot, User } from "lucide-react";
import { MarkdownContent } from "./markdown-content";
import { ReasoningBlock } from "./reasoning-block";

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={`flex-1 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        {message.reasoning && <ReasoningBlock content={message.reasoning} />}
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? "bg-[var(--user-bubble)] text-[var(--user-bubble-text)] rounded-br-md"
              : "bg-[var(--bot-bubble)] border border-[var(--bot-bubble-border)] rounded-bl-md"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownContent
              content={message.content}
              className="prose-sm dark:prose-invert"
            />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {message.timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
