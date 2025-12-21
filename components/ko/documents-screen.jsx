"use client"

import Image from "next/image"
import { useState } from "react"

/** @typedef {Object} DocumentsScreenProps */

/** @param {any} props */
/** @param {any} props */
export function DocumentsScreen({ onBack }) {
  const [selectedDocType, setSelectedDocType] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  const documentTypes = [
    {
      id: "proposals",
      icon: "/images/proposals.png",
      label: "Proposals",
      prompt: "Which project do you want me to find a proposal for?",
    },
    {
      id: "markups",
      icon: "/images/markups.png",
      label: "Markups",
      prompt: "Which project do you want me to find a markup for?",
    },
    {
      id: "takeoffs",
      icon: "/images/takeoffs.png",
      label: "Takeoffs",
      prompt: "Which project do you want me to find a takeoff for?",
    },
  ]

  const handleDocTypeClick = (typeId) => {
    setSelectedDocType(typeId)
    setSearchQuery("")
  }

  const handleSearch = () => {
    console.log("[v0] Searching for:", searchQuery)
  }

  const selectedType = documentTypes.find((t) => t.id === selectedDocType)

  if (!selectedDocType) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <button onClick={onBack} className="text-sm text-[#9b9b9b] hover:text-[#ececec] mb-4">
            ← Back
          </button>
          <h2 className="text-2xl font-medium text-[#ececec]">Documents</h2>
          <p className="text-sm text-[#9b9b9b] mt-2">Select a document type to search</p>
        </div>

        {/* Document Type Grid */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
            {documentTypes.map((docType) => (
              <button
                key={docType.id}
                onClick={() => handleDocTypeClick(docType.id)}
                className="flex flex-col items-center gap-4 p-8 bg-[#d9d9d9] border border-input rounded-2xl hover:bg-[#c9c9c9] hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
              >
                <Image
                  src={docType.icon || "/placeholder.svg"}
                  alt={docType.label}
                  width={120}
                  height={120}
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
                <span className="text-lg font-medium text-[#1a1a1a] group-hover:text-primary transition-colors">
                  {docType.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Upper Window - Display Area */}
      <div className="flex-1 border-b border-border p-6">
        <button onClick={() => setSelectedDocType(null)} className="text-sm text-[#9b9b9b] hover:text-[#ececec] mb-4">
          ← Back to Documents
        </button>
        <h3 className="text-xl font-medium text-[#ececec] mb-4">{selectedType?.label}</h3>
        <div className="h-full overflow-y-auto">
          <p className="text-sm text-[#9b9b9b]">Search results will appear here...</p>
        </div>
      </div>

      {/* Lower Window - Agent Input Area */}
      <div className="p-6">
        <p className="text-sm text-[#ececec] mb-4">{selectedType?.prompt}</p>
        <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-input">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Type project name or use voice..."
            className="flex-1 bg-transparent outline-none text-[#ececec] placeholder:text-[#9b9b9b]"
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  )
}