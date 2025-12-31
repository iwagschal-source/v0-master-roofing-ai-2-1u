"use client";

import React, { createContext, useContext, useState } from "react";
import { useChat } from "@/hooks/useChat";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const chat = useChat(); // your existing hook

  // store follow-up context here too
  const [followUpContext, setFollowUpContext] = useState(null);

  return (
    <ChatContext.Provider
      value={{
        ...chat,
        followUpContext,
        setFollowUpContext,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used inside ChatProvider");
  return ctx;
}
