"use client"

import { useState } from "react"
import { NavigationRail } from "@/components/ko/navigation-rail"
import { TopHeader } from "@/components/ko/top-header"
import { KOStage } from "@/components/ko/ko-stage"
import { ConversationPane } from "@/components/ko/conversation-pane"
import { StartupSequence } from "@/components/ko/startup-sequence"
import { HomeScreen } from "@/components/ko/home-screen"
import { DocumentsScreen } from "@/components/ko/documents-screen"
import { EmailScreen } from "@/components/ko/email-screen"
import { SettingsScreen } from "@/components/ko/settings-screen"
import { ZoomScreen } from "@/components/ko/zoom-screen"
import { MobileMenuToggle } from "@/components/ko/mobile-menu-toggle"
import { HistoryItem } from "@/types/history"
import { ChatShell } from "@/components/ko/chat-shell"

export default function HomePage() {
  const [isStartupComplete, setIsStartupComplete] = useState(false)
  const [isShuttingDown, setIsShuttingDown] = useState(false)
  const [isPoweredOn, setIsPoweredOn] = useState(true)

  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [activeMode, setActiveMode] = useState("home")
  const [showFiles, setShowFiles] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showZoom, setShowZoom] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [topPaneHeight, setTopPaneHeight] = useState(0)
  const [koState, setKoState] = useState("idle")
  const [selectedHistoryItem, setSelectedHistoryItem] = useState()

  const [historyItems] = useState([
    {
      id: "q3-2025-report",
      type: "pdf",
      label: "Q3-2025-Report",
      source: "Vertex AI",
      content: "Q3 2025 Sales Report\n\nExecutive Summary:\nThis quarter showed strong performance across all metrics.\n\nWin Rate: 18% (up from 15% in Q2)\nTotal Deals Closed: 47\nAverage Deal Size: $125,000\n\nKey Insights:\n- Enterprise segment grew 22%\n- Customer retention at 94%\n- Pipeline value increased to $5.2M",
      preview: "Q3 2025 sales performance showing 18% win rate and 47 closed deals.",
      timestamp: new Date(Date.now() - 86400000),
    },
    {
      id: "pipeline-chart-nov",
      type: "chart",
      label: "Pipeline-Chart-November",
      source: "Power BI",
      content: "Sales Pipeline Data - November 2025\n\nStage breakdown:\nProspecting: $2.1M\nQualification: $1.5M\nProposal: $980K\nNegotiation: $620K",
      preview: "November pipeline analysis with stage-by-stage breakdown.",
      timestamp: new Date(Date.now() - 172800000),
    },
  ])

  const isWorkspaceVisible = selectedHistoryItem !== undefined || koState === "thinking" || koState === "speaking"

  const handleSelectHistoryItem = (item) => {
    setSelectedHistoryItem(item)
  }

  const handleCloseViewer = () => {
    setSelectedHistoryItem(undefined)
  }

  const handleShutdown = () => {
    if (isPoweredOn) {
      setIsShuttingDown(true)
      setIsPoweredOn(false)
    } else {
      setIsStartupComplete(false)
      setIsPoweredOn(true)
      setIsShuttingDown(false)
    }
  }

  const handleStartChat = () => {
    setHasStartedChat(true)
    setActiveMode("home")
    setShowFiles(false)
    setShowEmail(false)
    setShowSettings(false)
    setShowZoom(false)
  }

  const handleModeChange = (mode) => {
    setIsMobileMenuOpen(false)

    if (mode === "home") {
      setHasStartedChat(false)
      setActiveMode("home")
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setSelectedHistoryItem(undefined)
    } else if (mode === "email") {
      setShowEmail(true)
      setShowFiles(false)
      setShowSettings(false)
      setShowZoom(false)
      setHasStartedChat(true)
    } else if (mode === "documents") {
      setShowFiles(true)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setHasStartedChat(true)
    } else if (mode === "settings") {
      setShowSettings(true)
      setShowFiles(false)
      setShowEmail(false)
      setShowZoom(false)
      setHasStartedChat(true)
    } else if (mode === "zoom") {
      setShowZoom(true)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setHasStartedChat(true)
    } else {
      setActiveMode(mode)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      if (!hasStartedChat) {
        setHasStartedChat(true)
      }
    }
  }

  const handleNavigateToFiles = () => {
    setShowFiles(true)
    setShowEmail(false)
    setShowSettings(false)
    setHasStartedChat(true)
  }

  /*   if (!isStartupComplete || isShuttingDown) {
      return (
        <StartupSequence
          onComplete={() => {
            if (isShuttingDown) {
              setIsShuttingDown(false)
              setIsStartupComplete(true)
              console.log("[v0] App shutdown complete")
            } else {
              setIsStartupComplete(true)
              setIsPoweredOn(true)
            }
          }}
          isShuttingDown={isShuttingDown}
        />
      )
    } */

  const showHomeScreen =
    !hasStartedChat && activeMode === "home" && !showFiles && !showEmail && !showSettings && !showZoom

  return (
    <div className="flex h-screen bg-background text-foreground">
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`${isMobileMenuOpen ? "fixed left-0 top-0 bottom-0 z-50" : "hidden"} md:block`}>
        <NavigationRail
          activeMode={
            showEmail ? "email" : showFiles ? "documents" : showSettings ? "settings" : showZoom ? "zoom" : activeMode
          }
          onModeChange={handleModeChange}
          visible={true}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4">
          <MobileMenuToggle onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
          <div className="flex-1">
            <TopHeader onShutdown={handleShutdown} isPoweredOn={isPoweredOn} />
          </div>
        </div>

        {showFiles ? (
          <DocumentsScreen onBack={() => setShowFiles(false)} />
        ) : showEmail ? (
          <EmailScreen />
        ) : showSettings ? (
          <SettingsScreen />
        ) : showZoom ? (
          <ZoomScreen />
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 md:w-[40%] flex flex-col">
              <ChatShell
                activeMode={activeMode}
                onExpandStage={() => { }}
                onKoStateChange={setKoState}
                historyItems={historyItems}
                onSelectHistoryItem={handleSelectHistoryItem}
                selectedHistoryId={selectedHistoryItem?.id}
                onNavigateToFiles={handleNavigateToFiles}

                // ✅ allow home only when you’re truly on home mode
                allowHome={activeMode === "home"}
              />
            </div>

            {isWorkspaceVisible && (
              <>
                <div className="hidden md:block w-px bg-border" />
                <div className="hidden md:flex md:w-[60%] flex-col">
                  <KOStage
                    activeMode={activeMode}
                    selectedHistoryItem={selectedHistoryItem}
                    onCloseViewer={handleCloseViewer}
                  />
                </div>
                <div className="md:hidden fixed inset-0 z-50 bg-background">
                  <KOStage
                    activeMode={activeMode}
                    selectedHistoryItem={selectedHistoryItem}
                    onCloseViewer={handleCloseViewer}
                  />
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}