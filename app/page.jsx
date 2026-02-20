"use client"

// KO App Homepage v1.1 - Main Application Entry Point
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { NavigationRail } from "@/components/ko/navigation-rail"
import { TopHeader } from "@/components/ko/top-header"
import { KOStage } from "@/components/ko/ko-stage"
import { ConversationPane } from "@/components/ko/conversation-pane"
import { StartupSequence } from "@/components/ko/startup-sequence"
import { HomeScreen } from "@/components/ko/home-screen"
import { GmailScreen } from "@/components/ko/gmail-screen"
import { SettingsScreen } from "@/components/ko/settings-screen"
import { ZoomScreen } from "@/components/ko/zoom-screen"
import { ModelArenaDashboard } from "@/components/ko/model-arena-dashboard"
import { MobileMenuToggle } from "@/components/ko/mobile-menu-toggle"
import { ChatShell } from "@/components/ko/chat-shell"
import { ChatScreen } from "@/components/ko/chat-screen"
import { AsanaScreen } from "@/components/ko/asana-screen"
import { MiniKOChat } from "@/components/ko/mini-ko-chat"
import { AgentDashboardScreen } from "@/components/ko/agent-dashboard-screen"
import { AgentDetailScreen } from "@/components/ko/agent-detail-screen"
import { AgentNetworkMapScreen } from "@/components/ko/agent-network-map-screen"
import { AddAgentScreen } from "@/components/ko/add-agent-screen"
import { CloneAgentModal } from "@/components/ko/clone-agent-modal"
import { UserAdminScreen } from "@/components/ko/user-admin-screen"
import { SalesDashboard } from "@/components/ko/sales-dashboard"
import { EstimatingCenterScreen } from "@/components/ko/estimating-center-screen"
import ProjectFoldersScreen from "@/components/ko/project-folders-screen"
import { ProjectFolderDetail } from "@/components/ko/project-folder-detail"
import { ContactsScreen } from "@/components/ko/contacts-screen"
import { CommunicationsHubScreen } from "@/components/ko/communications-hub-screen"
import { agents as fallbackAgents } from "@/data/agent-data"

export default function HomePage() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const status = sessionResult?.status || "loading"
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const [isStartupComplete, setIsStartupComplete] = useState(false)
  const [isShuttingDown, setIsShuttingDown] = useState(false)
  const [isPoweredOn, setIsPoweredOn] = useState(true)

  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [activeMode, setActiveMode] = useState("home")
  const [showEmail, setShowEmail] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showZoom, setShowZoom] = useState(false)
  const [showArena, setShowArena] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [showAsana, setShowAsana] = useState(false)
  const [showAgents, setShowAgents] = useState(false)
  const [showUserAdmin, setShowUserAdmin] = useState(false)
  const [showSales, setShowSales] = useState(false)
  const [showEstimating, setShowEstimating] = useState(false)
  const [estimatingProjectId, setEstimatingProjectId] = useState(null) // pre-select project in EC
  const [showProjects, setShowProjects] = useState(false)
  const [selectedFolderProject, setSelectedFolderProject] = useState(null) // { id, name, folder?, fileName? } for detail view
  const [showContacts, setShowContacts] = useState(false)
  const [showCommsHub, setShowCommsHub] = useState(false)
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

  const [chatContext, setChatContext] = useState(null)

  const isWorkspaceVisible = selectedHistoryItem !== undefined || selectedSource !== null

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
    setShowEmail(false)
    setShowSettings(false)
    setShowZoom(false)
    setShowArena(false)
    setShowProjects(false)
  }

  const handleModeChange = (mode) => {
    console.log("Navigating to mode:", mode)
    setIsMobileMenuOpen(false)

    if (mode === "home") {
      setHasStartedChat(false)
      setActiveMode("home")
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowMessages(false)
      setShowAsana(false)
      setShowAgents(false)
      setShowUserAdmin(false)
      setShowSales(false)
      setShowEstimating(false)
      setShowProjects(false)
      setSelectedFolderProject(null)
      setShowContacts(false)
      setShowCommsHub(false)
      setSelectedAgent(null)
      setShowAgentNetwork(false)
      setShowAddAgent(false)
      setAgentToClone(null)
      setSelectedHistoryItem(undefined)
    } else if (mode === "estimating") {
      setShowEstimating(true)
      setShowProjects(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowMessages(false)
      setShowAsana(false)
      setShowAgents(false)
      setShowUserAdmin(false)
      setShowSales(false)
    } else if (mode === "projects") {
      setShowProjects(true)
      setShowContacts(false)
      setShowEstimating(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowMessages(false)
      setShowAsana(false)
      setShowAgents(false)
      setShowUserAdmin(false)
      setShowSales(false)
      setHasStartedChat(true)
    } else if (mode === "contacts") {
      setShowContacts(true)
      setShowProjects(false)
      setShowEstimating(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowMessages(false)
      setShowAsana(false)
      setShowAgents(false)
      setShowUserAdmin(false)
      setShowSales(false)
      setHasStartedChat(true)
    } else if (mode === "arena") {
      setShowArena(true)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "email") {
      // Redirect to Communications Hub
      handleModeChange("communications")
      return
    } else if (mode === "settings") {
      setShowSettings(true)
      setShowEmail(false)
      setShowZoom(false)
      setShowArena(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "zoom") {
      setShowZoom(true)
      setShowEmail(false)
      setShowSettings(false)
      setShowArena(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "messages") {
      // Redirect to Communications Hub
      handleModeChange("communications")
      return
    } else if (mode === "asana") {
      setShowAsana(true)
      setShowMessages(false)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowAgents(false)
      setHasStartedChat(true)
    } else if (mode === "agents") {
      setShowAgents(true)
      setSelectedAgent(null)
      setShowAgentNetwork(false)
      setShowAddAgent(false)
      setAgentToClone(null)
      setShowAsana(false)
      setShowMessages(false)
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
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setHasStartedChat(true)
    } else if (mode === "communications") {
      setShowCommsHub(true)
      setShowEmail(false)
      setShowMessages(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowAsana(false)
      setShowAgents(false)
      setShowUserAdmin(false)
      setShowSales(false)
      setShowEstimating(false)
      setShowProjects(false)
      setShowContacts(false)
      setHasStartedChat(true)
    } else {
      setActiveMode(mode)
      setShowEmail(false)
      setShowSettings(false)
      setShowZoom(false)
      setShowArena(false)
      setShowAgents(false)
      setShowCommsHub(false)
      if (!hasStartedChat) {
        setHasStartedChat(true)
      }
    }
  }

  const showHomeScreen =
    !hasStartedChat && activeMode === "home" && !showEmail && !showSettings && !showZoom

  const handleGoToKO = () => {
    setHasStartedChat(true)
    setActiveMode("chat")
    setShowEmail(false)
    setShowSettings(false)
    setShowZoom(false)
    setShowArena(false)
    setShowMessages(false)
    setShowAsana(false)
    setShowAgents(false)
    setShowProjects(false)
  }

  // Show loading while checking auth
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* Mini KO Chat - floating on all screens except main chat and project detail (which has its own chat) */}
      {!showHomeScreen && activeMode !== "chat" && (
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
            showCommsHub ? "communications" : showEmail ? "email" : showSettings ? "settings" : showZoom ? "zoom" : showArena ? "arena" : showMessages ? "messages" : showAsana ? "asana" : showAgents ? "agents" : showUserAdmin ? "admin" : showSales ? "sales" : showEstimating ? "estimating" : showProjects ? "projects" : showContacts ? "contacts" : activeMode
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
          showEmail ? (
            <GmailScreen />
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
          ) : showEstimating ? (
            <EstimatingCenterScreen
              initialProjectId={estimatingProjectId}
              onProjectLoaded={() => setEstimatingProjectId(null)}
            />
          ) : showProjects ? (
            selectedFolderProject ? (
              <ProjectFolderDetail
                projectId={selectedFolderProject.id}
                projectName={selectedFolderProject.name}
                initialFolder={selectedFolderProject.folder}
                initialFileName={selectedFolderProject.fileName}
                onClose={() => setSelectedFolderProject(null)}
                onNavigateToEstimating={() => {
                  const pid = selectedFolderProject?.id
                  setSelectedFolderProject(null)
                  setEstimatingProjectId(pid || null)
                  handleModeChange('estimating')
                }}
              />
            ) : (
              <ProjectFoldersScreen
                onNavigateToProject={(project) => {
                  setSelectedFolderProject(project)
                }}
              />
            )
          ) : showContacts ? (
            <ContactsScreen />
          ) : showCommsHub ? (
            <CommunicationsHubScreen />
          ) : (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className={`flex-1 ${isWorkspaceVisible ? 'md:w-[40%]' : ''} flex flex-col`}>
                <ChatShell
                  activeMode={activeMode}
                  onExpandStage={() => { }}
                  onKoStateChange={setKoState}
                  initialContext={chatContext}
                  onClearContext={() => setChatContext(null)}
                  historyItem={selectedHistoryItem}
                  onSourceClick={handleSourceClick}
                  allowHome={activeMode === "home"}
                  onNavigateToProject={(project) => {
                    setSelectedFolderProject(project)
                    handleModeChange('projects')
                  }}
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
