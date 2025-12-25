"use client"

import { useEffect, useState } from "react"
import { HomeScreen } from "./home-screen"
import { ConversationPane } from "./conversation-pane"
import { useChat } from "@/hooks/useChat"

export function ChatShell(props) {
  const [view, setView] = useState("home") // "home" | "chat"
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      content: "Good morning! I'm KO, your Chief Agent Officer. How can I assist you today?",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      role: "user",
      content: "What's our Win Rate for the last 30 days?",
      timestamp: new Date(Date.now() - 3000000),
    },
    {
      id: "3",
      role: "assistant",
      content: "I've reviewed the Q3 report and your Win Rate for the last 30 days is 18%.",
      timestamp: new Date(Date.now() - 2900000),
      source: {
        itemId: "q3-2025-report",
        label: "Q3-2025-Report",
      },
      reasoning: [
        "Retrieved Q3-2025-Report from document storage",
        "Parsed sales data for last 30 days",
        "Calculated win rate: 18 wins / 100 opportunities = 18%",
      ],
    },
  ]
  );

  const { sendMessage, response, error } = useChat()
  const [isThinking, setIsThinking] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)


  useEffect(() => {
    if (response?.answer) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID?.() ?? String(Date.now() + 1),
          role: "assistant",
          content: response.answer,
          sources: response.sources ?? [],
          reasoning: response.reasoning
            ? [response.reasoning]
            : null,                            // keep your existing UI
          timestamp: new Date(),
        },
      ])
    }
    else if (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID?.() ?? String(Date.now() + 1),
          role: "assistant",
          content: error.message,
          timestamp: new Date(),
        },
      ])
    }
  }, [response, error])

  const submit = async (text) => {

    // 1) add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ])

    // 2) switch view to chat
    setView("chat")

    // 3) fetch assistant response
    setIsThinking(true)
    setShowReasoning(true)

    await sendMessage(text) // <- ideal if sendMessage returns response
    setShowReasoning(false)
    setIsThinking(false)

  }

  return view === "home" ? (
    <HomeScreen
      {...props}
      onSubmit={submit}              // ✅ same submit function
    />
  ) : (
    <ConversationPane
      {...props}
      messages={messages}            // ✅ conversation renders from parent state
      isThinking={isThinking}
      onSubmit={submit}              // ✅ same submit function
      showReasoning={showReasoning}
    />
  )
}
