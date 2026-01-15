"use client"

// Agent Control Dashboard v1.0
import { useState, useEffect } from "react"
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
import { ModelArenaDashboard } from "@/components/ko/model-arena-dashboard"
import { MobileMenuToggle } from "@/components/ko/mobile-menu-toggle"
import { HistoryItem } from "@/types/history"
import { ChatShell } from "@/components/ko/chat-shell"
import { HistoryScreen } from "@/components/ko/history-screen"
import { ProjectsScreen } from "@/components/ko/projects-screen"
import { ProjectDetailScreen } from "@/components/ko/project-detail-screen"
import { ProposalPreviewScreen } from "@/components/ko/proposal-preview-screen"
import { ChatScreen } from "@/components/ko/chat-screen"
import { AsanaScreen } from "@/components/ko/asana-screen"
import { WhatsAppScreen } from "@/components/ko/whatsapp-screen"
import { MiniKOChat } from "@/components/ko/mini-ko-chat"
import { AgentDashboardScreen } from "@/components/ko/agent-dashboard-screen"
import { AgentDetailScreen } from "@/components/ko/agent-detail-screen"
import { AgentNetworkMapScreen } from "@/components/ko/agent-network-map-screen"
import { AddAgentScreen } from "@/components/ko/add-agent-screen"
import { CloneAgentModal } from "@/components/ko/clone-agent-modal"
import { UserAdminScreen } from "@/components/ko/user-admin-screen"
import { SalesDashboard } from "@/components/ko/sales-dashboard"
import { agents as fallbackAgents } from "@/data/agent-data"

export default function HomePage() {
  const [isStartupComplete, setIsStartupComplete] = useState(false)
  const [isShuttingDown, setIsShuttingDown] = useState(false)
  const [isPoweredOn, setIsPoweredOn] = useState(true)

  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [activeMode, setActiveMode] = useState("home")
  const [showHistory, setShowHistory] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showZoom, setShowZoom] = useState(false)
  const [showArena, setShowArena] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [showProposal, setShowProposal] = useState(false)
  const [proposalTakeoffData, setProposalTakeoffData] = useState(null)
  const [showMessages, setShowMessages] = useState(false)
  const [showAsana, setShowAsana] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [showAgents, setShowAgents] = useState(false)
  const [showUserAdmin, setShowUserAdmin] = useState(false)
  const [showSales, setShowSales] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showAgentNetwork, setShowAgentNetwork] = useState(false)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [agentToClone, setAgentToClone] = useState(null)
  const [agentsList, setAgentsList] = useState(fallbackAgents)
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [topPaneHeight, setTopPaneHeight] = useState(0)
  const [koState, setKoState] = useState("idle")
  const [selectedHistoryItem, setSelectedHistoryItem] = useState()
  const [selectedSource, setSelectedSource] = useState(null)

  // Fetch agents from backend on mount
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/ko/factory/agents')
        if (res.ok) {
          const data = await res.json()
          if (data.agents && data.agents.length > 0) {
            setAgentsList(data.agents)
          }
        }
      } catch (error) {
        console.error('Failed to fetch agents from backend:', error)
        // Keep fallback agents on error
      } finally {
        setAgentsLoading(false)
      }
    }
    fetchAgents()
  }, [])

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
      source: "Vertex AI",
      content: "Sales Pipeline Data - November 2025\n\nStage breakdown:\nProspecting: $2.1M\nQualification: $1.5M\nProposal: $980K\nNegotiation: $620K",
      preview: "November pipeline analysis with stage-by-stage breakdown.",
      timestamp: new Date(Date.now() - 172800000),
    },
  ])

  const [chatContext, setChatContext] = useState(null)

  const isWorkspaceVisible = selectedHistoryItem !== undefined || selectedSource !== null

  const handleSelectHistoryItem = (item) => {
    setSelectedHistoryItem(item)
    handleStartChat("chat")
  }

  const handleCloseViewer = () => {
    setSelectedHistoryItem(undefined)
    setSelectedSource(null)
  }

  const handleSourceClick = (source) => {
    // Convert source to format expected by SourceViewer
    const sourceItem = {
      id: source.id || source.url,
      type: source.type || (source.url?.endsWith('.pdf') ? 'pdf' : 'document'),
      label: source.title || 'Document',
      source: source.source || 'Vertex AI',
      url: source.url,
      gcs_uri: source.gcs_uri, // Pass GCS URI for signed URL generation
      content: source.snippet || source.content || '',
      timestamp: new Date(),
    }
    setSelectedSource(sourceItem)
    setSelectedHistoryItem(undefined) // Clear history item if any
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

  const handleStartChat = (mode) => {
    setHasStartedChat(true)
    setActiveMode(mode)
    setShowHistory(false)
    setShowFiles(false)
    setShowEmail(false)
    setShowSettings(false)
    setShowZoom(false)
    setShowArena(false)
  }

  const handleModeChange = (mode) => {
    console.log("Navigating to mode:", mode)
    setIsMobileMenuOpen(false)

    if (mode === "home") {
      setHasStartedChat(false)
      setActiveMode("home")
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowHistory(false)
      setShowProjects(false)
      setShowMessages(false)
      setShowAsana(false)
      setShowWhatsApp(false)
      setShowAgents(false)
      setShowUserAdmin(false)
      setShowSales(false)
      setSelectedAgent(null)
      setShowAgentNetwork(false)
      setShowAddAgent(false)
      setAgentToClone(null)
      setSelectedProject(null)
      setShowProposal(false)
      setSelectedHistoryItem(undefined)
    } else if (mode === "arena") {
      setShowArena(true)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowHistory(false)
      setShowProjects(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "email") {
      setShowEmail(true)
      setShowFiles(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowProjects(false)
      setShowAgents(false)
      setHasStartedChat(true)
      setShowHistory(false)
    } else if (mode === "documents") {
      setShowFiles(true)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowProjects(false)
      setShowAgents(false)
      setHasStartedChat(true)
      setShowHistory(false)
    } else if (mode === "settings") {
      setShowSettings(true)
      setShowFiles(false)
      setShowEmail(false)
      setShowZoom(false)
      setShowArena(false)
      setShowProjects(false)
      setShowAgents(false)
      setHasStartedChat(true)
      setShowHistory(false)
    } else if (mode === "zoom") {
      setShowZoom(true)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowArena(false)
      setShowProjects(false)
      setShowAgents(false)
      setHasStartedChat(true)
      setShowHistory(false)
    } else if (mode === "history") {
      setShowHistory(true)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowProjects(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "projects") {
      setShowProjects(true)
      setSelectedProject(null)
      setShowProposal(false)
      setShowHistory(false)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowMessages(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "messages") {
      setShowMessages(true)
      setShowProjects(false)
      setShowHistory(false)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowAsana(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "asana") {
      setShowAsana(true)
      setShowWhatsApp(false)
      setShowMessages(false)
      setShowProjects(false)
      setShowHistory(false)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "whatsapp") {
      setShowWhatsApp(true)
      setShowAsana(false)
      setShowMessages(false)
      setShowProjects(false)
      setShowHistory(false)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowAgents(false)
      setShowUserAdmin(false)
      setShowSales(false)
      setHasStartedChat(true)
    } else if (mode === "agents") {
      setShowAgents(true)
      setSelectedAgent(null)
      setShowAgentNetwork(false)
      setShowAddAgent(false)
      setAgentToClone(null)
      setShowAsana(false)
      setShowMessages(false)
      setShowProjects(false)
      setShowHistory(false)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowUserAdmin(false)
      setHasStartedChat(true)
    } else if (mode === "admin") {
      setShowUserAdmin(true)
      setShowAgents(false)
      setShowAsana(false)
      setShowMessages(false)
      setShowProjects(false)
      setShowHistory(false)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowSales(false)
      setHasStartedChat(true)
    } else if (mode === "sales") {
      setShowSales(true)
      setShowUserAdmin(false)
      setShowAgents(false)
      setShowAsana(false)
      setShowMessages(false)
      setShowProjects(false)
      setShowHistory(false)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setHasStartedChat(true)
    } else {
      setActiveMode(mode)
      setShowFiles(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowProjects(false)
      setShowAgents(false)
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

  const showHomeScreen =
    !hasStartedChat && activeMode === "home" && !showFiles && !showEmail && !showSettings && !showZoom

  const handleGoToKO = () => {
    setHasStartedChat(true)
    setActiveMode("chat")
    setShowFiles(false)
    setShowEmail(false)
    setShowSettings(false)
    setShowZoom(false)
    setShowArena(false)
    setShowHistory(false)
    setShowProjects(false)
    setShowMessages(false)
    setShowAsana(false)
    setShowWhatsApp(false)
    setShowAgents(false)
  }

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* Mini KO Chat - floating on all screens except main chat and project detail (which has its own chat) */}
      {!showHomeScreen && activeMode !== "chat" && !showHistory && !selectedProject && (
        <MiniKOChat onMaximize={handleGoToKO} />
      )}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`${isMobileMenuOpen ? "fixed left-0 top-0 bottom-0 z-50" : "hidden"} md:block`}>
        <NavigationRail
          activeMode={
            showEmail ? "email" : showFiles ? "documents" : showSettings ? "settings" : showZoom ? "zoom" : showArena ? "arena" : showHistory ? "history" : showProjects ? "projects" : showMessages ? "messages" : showAsana ? "asana" : showWhatsApp ? "whatsapp" : showAgents ? "agents" : showUserAdmin ? "admin" : showSales ? "sales" : activeMode
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

        {
          showHistory ? (
            <HistoryScreen
              historyItems={historyItems}
              onSelectHistoryItem={handleSelectHistoryItem}
              selectedHistoryId={selectedHistoryItem?.id}
            />
          ) : showFiles ? (
            <DocumentsScreen onBack={() => setShowFiles(false)} />
          ) : showEmail ? (
            <EmailScreen />
          ) : showSettings ? (
            <SettingsScreen />
          ) : showZoom ? (
            <ZoomScreen />
          ) : showArena ? (
            <ModelArenaDashboard onBack={() => setShowArena(false)} agents={agentsList} />
          ) : showMessages ? (
            <ChatScreen />
          ) : showAsana ? (
            <AsanaScreen />
          ) : showWhatsApp ? (
            <WhatsAppScreen />
          ) : showAgents ? (
            showAddAgent ? (
              <AddAgentScreen
                onBack={() => setShowAddAgent(false)}
                onSave={async (newAgent) => {
                  // Add locally for immediate feedback
                  setAgentsList(prev => [...prev, newAgent])
                  setShowAddAgent(false)
                  // Then refresh from backend to get proper format
                  try {
                    const res = await fetch('/api/ko/factory/agents')
                    if (res.ok) {
                      const data = await res.json()
                      if (data.agents?.length > 0) {
                        setAgentsList(data.agents)
                      }
                    }
                  } catch (e) {
                    console.error('Failed to refresh agents:', e)
                  }
                }}
              />
            ) : showAgentNetwork ? (
              <AgentNetworkMapScreen
                agents={agentsList}
                onBack={() => setShowAgentNetwork(false)}
                onSelectAgent={(agent) => {
                  setSelectedAgent(agent)
                  setShowAgentNetwork(false)
                }}
              />
            ) : selectedAgent ? (
              <AgentDetailScreen
                agent={selectedAgent}
                onBack={() => setSelectedAgent(null)}
                onClone={(agent) => setAgentToClone(agent)}
              />
            ) : (
              <AgentDashboardScreen
                agents={agentsList}
                onSelectAgent={(agent) => setSelectedAgent(agent)}
                onAddAgent={() => setShowAddAgent(true)}
                onViewNetwork={() => setShowAgentNetwork(true)}
                onCloneAgent={(agent) => setAgentToClone(agent)}
              />
            )
          ) : showUserAdmin ? (
            <UserAdminScreen onBack={() => setShowUserAdmin(false)} />
          ) : showSales ? (
            <SalesDashboard />
          ) : showProjects ? (
            showProposal && selectedProject ? (
              <ProposalPreviewScreen
                project={selectedProject}
                takeoffData={proposalTakeoffData}
                onBack={() => {
                  setShowProposal(false)
                  setProposalTakeoffData(null)
                }}
              />
            ) : selectedProject ? (
              <ProjectDetailScreen
                project={selectedProject}
                onBack={() => setSelectedProject(null)}
                onPreviewProposal={(project, takeoffData = null) => {
                  setSelectedProject(project)
                  setProposalTakeoffData(takeoffData)
                  setShowProposal(true)
                }}
              />
            ) : (
              <ProjectsScreen
                onSelectProject={(project) => setSelectedProject(project)}
                onBack={() => setShowProjects(false)}
              />
            )
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className={`flex-1 ${isWorkspaceVisible ? 'md:w-[40%]' : ''} flex flex-col`}>
                <ChatShell
                  activeMode={activeMode}
                  onExpandStage={() => { }}
                  onKoStateChange={setKoState}
                  onNavigateToFiles={handleNavigateToFiles}
                  initialContext={chatContext}
                  onClearContext={() => setChatContext(null)}
                  historyItem={selectedHistoryItem}
                  onSourceClick={handleSourceClick}
                  allowHome={activeMode === "home"}
                />
              </div>

              {isWorkspaceVisible && (
                <>
                  <div className="hidden md:block w-px bg-border" />
                  <div className="hidden md:flex md:w-[60%] flex-col">
                    <KOStage
                      activeMode={activeMode}
                      selectedHistoryItem={selectedHistoryItem || selectedSource}
                      onCloseViewer={handleCloseViewer}
                    />
                  </div>
                  <div className="md:hidden fixed inset-0 z-50 bg-background">
                    <KOStage
                      activeMode={activeMode}
                      selectedHistoryItem={selectedHistoryItem || selectedSource}
                      onCloseViewer={handleCloseViewer}
                    />
                  </div>
                </>
              )}
            </div>
          )}

      </div>

      {/* Clone Agent Modal */}
      <CloneAgentModal
        agent={agentToClone}
        isOpen={!!agentToClone}
        onClose={() => setAgentToClone(null)}
        onClone={(clonedAgent) => {
          setAgentsList([...agentsList, clonedAgent])
          setAgentToClone(null)
        }}
      />
    </div>
  )
}
