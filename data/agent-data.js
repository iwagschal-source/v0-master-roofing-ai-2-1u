// Agent Command Center - Agent Registry Data
// This data will eventually come from the backend API

export const statusConfig = {
  live: {
    label: "LIVE",
    color: "bg-emerald-500",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500",
    animation: "animate-pulse",
    description: "Actively processing",
  },
  idle: {
    label: "IDLE",
    color: "bg-amber-500",
    textColor: "text-amber-400",
    borderColor: "border-amber-500",
    animation: "",
    opacity: "opacity-60",
    description: "Ready, awaiting request",
  },
  error: {
    label: "ERROR",
    color: "bg-red-500",
    textColor: "text-red-400",
    borderColor: "border-red-500",
    animation: "animate-pulse",
    description: "Failed, needs attention",
  },
  paused: {
    label: "PAUSED",
    color: "bg-purple-500",
    textColor: "text-purple-400",
    borderColor: "border-purple-500",
    animation: "",
    description: "Paused by auditor",
  },
  offline: {
    label: "OFFLINE",
    color: "bg-gray-500",
    textColor: "text-gray-400",
    borderColor: "border-gray-500",
    animation: "",
    opacity: "opacity-40",
    description: "Disabled or stopped",
  },
}

// Connection types for network visualization
export const connectionTypes = {
  query: { color: "#3b82f6", label: "Query Flow", dash: false },
  data: { color: "#10b981", label: "Data Flow", dash: false },
  audit: { color: "#a855f7", label: "Audit Flow", dash: true },
  alert: { color: "#ef4444", label: "Alert Flow", dash: true },
}

// Model/Provider configurations for icons
export const modelConfig = {
  "gemini": { name: "Gemini", color: "#4285F4", icon: "G" },
  "claude": { name: "Claude", color: "#D4A574", icon: "C" },
  "gpt": { name: "GPT", color: "#10A37F", icon: "O" },
  "vertex": { name: "Vertex AI", color: "#4285F4", icon: "V" },
  "custom": { name: "Custom", color: "#6366F1", icon: "?" },
}

// Agent registry - in production this comes from database/API
export const agents = [
  {
    id: "AGT-ORCH-001",
    name: "Gemini Router",
    description: "Central orchestrator that routes queries to specialized agents based on intent",
    model: "Gemini 2.0 Flash",
    modelKey: "gemini",
    status: "live",
    lastActivity: new Date().toISOString(),
    currentAction: "Routing query to BigQuery Agent... contacting AGT-BQ-001 for project data",
    queueDepth: 3, // requests waiting
    stats: {
      totalRequests: 15420,
      successRate: 99.2,
      avgLatency: 120,
      errorsToday: 3,
      requestsPerMinute: 12,
    },
    connections: ["AGT-BQ-001", "AGT-HS-001", "AGT-EMAIL-001", "AGT-RISK-001"],
    auditedBy: ["AGT-AUDIT-001"],
    schedule: "Always On",

    permissions: {
      readAccess: [
        { resource: "BigQuery - mr_core", scope: "All tables", enabled: true },
        { resource: "BigQuery - mr_raw", scope: "All tables", enabled: true },
        { resource: "BigQuery - mr_agent", scope: "All tables", enabled: true },
        { resource: "HubSpot CRM", scope: "Jobs, Contacts, Companies", enabled: true },
        { resource: "Google Drive", scope: "Proposals folder", enabled: true },
        { resource: "Asana", scope: "All projects", enabled: true },
      ],
      writeAccess: [
        { resource: "BigQuery - mr_agent", scope: "agent_logs, agent_metrics", enabled: true },
        { resource: "HubSpot CRM", scope: "None", enabled: false },
        { resource: "Asana", scope: "None", enabled: false },
      ],
      userSynteraction: [
        { id: "user_isaac", name: "Isaac", role: "CEO", canInitiate: true, canReceive: true },
        { id: "user_joel", name: "Joel", role: "Operations", canInitiate: true, canReceive: true },
        { id: "user_maria", name: "Maria", role: "Estimator", canInitiate: true, canReceive: false },
      ],
      agentSynteraction: [
        { agentId: "AGT-BQ-001", canCall: true, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-HS-001", canCall: true, canReceiveFrom: true, priority: 2 },
        { agentId: "AGT-EMAIL-001", canCall: true, canReceiveFrom: true, priority: 3 },
        { agentId: "AGT-RISK-001", canCall: true, canReceiveFrom: true, priority: 2 },
      ],
    },

    scoring: {
      overallScore: 94,
      accuracyScore: 98,
      latencyScore: 92,
      reliabilityScore: 96,
      evaluationFrequency: "Every 6 hours",
      lastEvaluation: "2026-01-13 12:00",
      nextEvaluation: "2026-01-13 18:00",
      metrics: [
        { name: "Response Accuracy", description: "Correct routing decisions", weight: 40, threshold: "95%" },
        { name: "Latency P95", description: "95th percentile response time", weight: 25, threshold: "<200ms" },
        { name: "Error Rate", description: "Failed requests percentage", weight: 20, threshold: "<1%" },
        { name: "Throughput", description: "Requests handled per minute", weight: 15, threshold: ">100/min" },
      ],
    },

    monitoring: {
      auditors: [
        { id: "user_isaac", name: "Isaac", type: "user", role: "Primary Auditor", since: "2025-12-01", active: true },
        { id: "AGT-AUDIT-001", name: "Audit Agent", type: "agent", role: "Automated Monitoring", since: "2025-12-15", active: true },
      ],
      alerts: [
        { type: "Error Spike", description: "More than 5 errors in 5 minutes", threshold: "5 errors/5min", enabled: true },
        { type: "Latency Warning", description: "P95 latency exceeds threshold", threshold: ">500ms", enabled: true },
        { type: "Downtime", description: "Agent unresponsive", threshold: ">30 seconds", enabled: true },
        { type: "Score Drop", description: "Overall score drops below threshold", threshold: "<85", enabled: true },
      ],
      channels: [
        { type: "Email", target: "isaac@masterroofing.com", enabled: true },
        { type: "Slack", target: "#ko-alerts", enabled: true },
        { type: "SMS", target: "+1-xxx-xxx-xxxx", enabled: false },
        { type: "Dashboard", target: "KO Command Center", enabled: true },
      ],
    },

    history: {
      totalExecutions: 15420,
      firstActive: "2025-12-01",
      uptimePercent: 99.7,
      totalErrors: 127,
      recentEvents: [
        { type: "info", message: "Routed query to AGT-BQ-001", timestamp: "15:23:45", details: "Query: project summary for Beach 67th" },
        { type: "success", message: "Response delivered to user", timestamp: "15:23:47", details: "Latency: 1.2s" },
        { type: "info", message: "Routed query to AGT-EMAIL-001", timestamp: "15:22:30", details: "Query: draft reply to GC" },
        { type: "warning", message: "Slow response from AGT-PBI-001", timestamp: "15:20:15", details: "Latency: 2.8s (threshold: 2s)" },
        { type: "error", message: "AGT-PBI-001 connection timeout", timestamp: "15:10:00", details: "Token refresh failed" },
      ],
      versions: [
        { version: "v2.3.1", date: "2026-01-10", changes: "Added fallback routing" },
        { version: "v2.3.0", date: "2026-01-05", changes: "New scoring metrics" },
        { version: "v2.2.0", date: "2025-12-20", changes: "Multi-agent synteraction" },
      ],
    },

    configFiles: [
      { name: "README.md", content: "# Gemini Router\n\nCentral orchestrator for the KO multi-agent system.\n\n## Purpose\nRoute incoming user queries to the appropriate specialized agent.\n\n## Instructions\n1. Parse user intent\n2. Identify relevant data sources\n3. Select best agent(s) to handle query\n4. Coordinate responses from multiple agents\n5. Merge and format final response\n\n## Constraints\n- Never modify data directly\n- Always log routing decisions\n- Escalate ambiguous queries to user", type: "markdown" },
      { name: "system_prompt.txt", content: "You are the central routing orchestrator for Master Roofing's KO system. Your job is to analyze incoming queries and route them to the appropriate specialized agents.", type: "text" },
    ],

    training: {
      lastTrained: "2026-01-10",
      datasetVersion: "v2.3",
      accuracy: 98.5,
    },
    mapping: {
      inputSources: ["User Query", "API Gateway"],
      outputTargets: ["All Specialized Agents"],
      routingRules: 12,
    },
  },

  {
    id: "AGT-BQ-001",
    name: "BigQuery Analytics",
    description: "Queries Master Roofing data warehouse for historical analysis and reporting",
    model: "Claude Sonnet",
    modelKey: "claude",
    status: "live",
    lastActivity: new Date(Date.now() - 5000).toISOString(),
    currentAction: "Executing query: SELECT project_name, total_amount FROM proposals WHERE gc_id = 'MJH'...",
    queueDepth: 1,
    stats: {
      totalRequests: 8934,
      successRate: 97.8,
      avgLatency: 450,
      errorsToday: 12,
      requestsPerMinute: 8,
    },
    connections: ["AGT-ORCH-001"],
    auditedBy: ["AGT-AUDIT-001"],
    schedule: "Always On",

    permissions: {
      readAccess: [
        { resource: "BigQuery - mr_core", scope: "All tables", enabled: true },
        { resource: "BigQuery - mr_raw", scope: "All tables", enabled: true },
        { resource: "BigQuery - mr_agent", scope: "Read only", enabled: true },
      ],
      writeAccess: [
        { resource: "BigQuery - mr_agent", scope: "query_cache table", enabled: true },
      ],
      userSynteraction: [
        { id: "user_isaac", name: "Isaac", role: "CEO", canInitiate: false, canReceive: true },
      ],
      agentSynteraction: [
        { agentId: "AGT-ORCH-001", canCall: false, canReceiveFrom: true, priority: 1 },
      ],
    },

    scoring: {
      overallScore: 91,
      accuracyScore: 96,
      latencyScore: 85,
      reliabilityScore: 94,
      evaluationFrequency: "Every 6 hours",
      lastEvaluation: "2026-01-13 12:00",
      nextEvaluation: "2026-01-13 18:00",
      metrics: [
        { name: "Query Accuracy", description: "Correct SQL generation", weight: 50, threshold: "95%" },
        { name: "Query Latency", description: "Average execution time", weight: 30, threshold: "<500ms" },
        { name: "Error Rate", description: "Failed queries percentage", weight: 20, threshold: "<2%" },
      ],
    },

    monitoring: {
      auditors: [
        { id: "user_isaac", name: "Isaac", type: "user", role: "Data Owner", since: "2025-12-01", active: true },
        { id: "AGT-AUDIT-001", name: "Audit Agent", type: "agent", role: "Query Monitoring", since: "2025-12-15", active: true },
      ],
      alerts: [
        { type: "Slow Query", description: "Query takes more than 5 seconds", threshold: ">5s", enabled: true },
        { type: "Error Rate", description: "More than 10% queries failing", threshold: ">10%", enabled: true },
      ],
      channels: [
        { type: "Slack", target: "#ko-alerts", enabled: true },
        { type: "Dashboard", target: "KO Command Center", enabled: true },
      ],
    },

    history: {
      totalExecutions: 8934,
      firstActive: "2025-12-05",
      uptimePercent: 99.2,
      totalErrors: 198,
      recentEvents: [
        { type: "success", message: "Query executed successfully", timestamp: "15:23:42", details: "247 rows returned" },
        { type: "info", message: "Query received from AGT-ORCH-001", timestamp: "15:23:40", details: null },
      ],
      versions: [
        { version: "v1.9.0", date: "2026-01-08", changes: "Improved SQL generation" },
        { version: "v1.8.0", date: "2025-12-28", changes: "Added query caching" },
      ],
    },

    configFiles: [
      { name: "README.md", content: "# BigQuery Analytics Agent\n\nGenerates and executes SQL queries against Master Roofing's data warehouse.", type: "markdown" },
    ],

    training: { lastTrained: "2026-01-08", datasetVersion: "v1.9", accuracy: 96.2 },
    mapping: { inputSources: ["Gemini Router"], outputTargets: ["Query Results"], routingRules: 0 },
  },

  {
    id: "AGT-HS-001",
    name: "HubSpot CRM",
    description: "Manages customer relationships, deals (Jobs), and communications via HubSpot",
    model: "GPT-4o-mini",
    modelKey: "gpt",
    status: "idle",
    lastActivity: new Date(Date.now() - 300000).toISOString(),
    currentAction: "Idle - awaiting next request",
    queueDepth: 0,
    stats: { totalRequests: 4521, successRate: 98.1, avgLatency: 195, errorsToday: 5, requestsPerMinute: 0 },
    connections: ["AGT-ORCH-001"],
    auditedBy: ["AGT-AUDIT-001"],
    schedule: "Business Hours (8AM-6PM EST)",

    permissions: {
      readAccess: [
        { resource: "HubSpot - Jobs", scope: "All", enabled: true },
        { resource: "HubSpot - Contacts", scope: "All", enabled: true },
        { resource: "HubSpot - Companies", scope: "All", enabled: true },
      ],
      writeAccess: [
        { resource: "HubSpot - Jobs", scope: "Update only", enabled: true },
        { resource: "HubSpot - Notes", scope: "Create", enabled: true },
      ],
      userSynteraction: [
        { id: "user_isaac", name: "Isaac", role: "CEO", canInitiate: true, canReceive: true },
        { id: "user_joel", name: "Joel", role: "Operations", canInitiate: true, canReceive: true },
      ],
      agentSynteraction: [
        { agentId: "AGT-ORCH-001", canCall: false, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-EMAIL-001", canCall: false, canReceiveFrom: true, priority: 2 },
      ],
    },

    scoring: {
      overallScore: 93, accuracyScore: 97, latencyScore: 94, reliabilityScore: 91,
      evaluationFrequency: "Every 12 hours", lastEvaluation: "2026-01-13 06:00", nextEvaluation: "2026-01-13 18:00",
      metrics: [
        { name: "CRM Accuracy", description: "Correct data retrieval", weight: 50, threshold: "95%" },
        { name: "API Latency", description: "HubSpot API response time", weight: 30, threshold: "<300ms" },
        { name: "Sync Status", description: "Data freshness", weight: 20, threshold: "<5min" },
      ],
    },

    monitoring: {
      auditors: [
        { id: "user_isaac", name: "Isaac", type: "user", role: "CRM Owner", since: "2025-12-01", active: true },
        { id: "AGT-AUDIT-001", name: "Audit Agent", type: "agent", role: "API Monitoring", since: "2025-12-15", active: true },
      ],
      alerts: [
        { type: "API Error", description: "HubSpot API failures", threshold: ">3/hour", enabled: true },
      ],
      channels: [
        { type: "Slack", target: "#ko-alerts", enabled: true },
      ],
    },

    history: {
      totalExecutions: 4521, firstActive: "2025-12-10", uptimePercent: 98.5, totalErrors: 86,
      recentEvents: [
        { type: "info", message: "Entered idle state", timestamp: "15:20:12", details: null },
      ],
      versions: [
        { version: "v1.4.0", date: "2026-01-05", changes: "Added email integration" },
      ],
    },

    configFiles: [
      { name: "README.md", content: "# HubSpot CRM Agent\n\nManages interactions with HubSpot CRM for Master Roofing.", type: "markdown" },
    ],

    training: { lastTrained: "2026-01-05", datasetVersion: "v1.4", accuracy: 94.8 },
    mapping: { inputSources: ["Gemini Router", "Scheduled Tasks"], outputTargets: ["HubSpot API", "Email Gateway"], routingRules: 0 },
  },

  {
    id: "AGT-EMAIL-001",
    name: "Email Drafting Agent",
    description: "Drafts professional emails in employee voice based on communication history",
    model: "Claude Sonnet",
    modelKey: "claude",
    status: "live",
    lastActivity: new Date(Date.now() - 2000).toISOString(),
    currentAction: "Drafting reply to MJH Construction regarding Beach 67th St change order...",
    queueDepth: 7, // Backlog building up!
    stats: { totalRequests: 2341, successRate: 96.5, avgLatency: 890, errorsToday: 8, requestsPerMinute: 15 },
    connections: ["AGT-ORCH-001", "AGT-HS-001"],
    auditedBy: ["AGT-AUDIT-001"],
    schedule: "Business Hours (7AM-7PM EST)",

    permissions: {
      readAccess: [
        { resource: "Gmail - Sent", scope: "Last 90 days", enabled: true },
        { resource: "Gmail - Inbox", scope: "Last 30 days", enabled: true },
        { resource: "HubSpot - Contacts", scope: "Read only", enabled: true },
      ],
      writeAccess: [
        { resource: "Gmail - Drafts", scope: "Create only", enabled: true },
      ],
      userSynteraction: [
        { id: "user_isaac", name: "Isaac", role: "CEO", canInitiate: true, canReceive: true },
        { id: "user_joel", name: "Joel", role: "Operations", canInitiate: true, canReceive: true },
        { id: "user_maria", name: "Maria", role: "Estimator", canInitiate: true, canReceive: true },
      ],
      agentSynteraction: [
        { agentId: "AGT-ORCH-001", canCall: false, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-HS-001", canCall: true, canReceiveFrom: false, priority: 2 },
      ],
    },

    scoring: {
      overallScore: 88, accuracyScore: 92, latencyScore: 78, reliabilityScore: 90,
      evaluationFrequency: "Every 6 hours", lastEvaluation: "2026-01-13 12:00", nextEvaluation: "2026-01-13 18:00",
      metrics: [
        { name: "Tone Accuracy", description: "Matches employee voice", weight: 40, threshold: "90%" },
        { name: "Draft Quality", description: "User acceptance rate", weight: 35, threshold: "85%" },
        { name: "Response Time", description: "Draft generation time", weight: 25, threshold: "<2s" },
      ],
    },

    monitoring: {
      auditors: [
        { id: "user_isaac", name: "Isaac", type: "user", role: "Content Reviewer", since: "2025-12-15", active: true },
        { id: "AGT-AUDIT-001", name: "Audit Agent", type: "agent", role: "Quality Monitoring", since: "2025-12-20", active: true },
      ],
      alerts: [
        { type: "Queue Backlog", description: "More than 5 pending drafts", threshold: ">5", enabled: true },
        { type: "Quality Drop", description: "Acceptance rate below threshold", threshold: "<80%", enabled: true },
      ],
      channels: [
        { type: "Slack", target: "#ko-alerts", enabled: true },
        { type: "Dashboard", target: "KO Command Center", enabled: true },
      ],
    },

    history: {
      totalExecutions: 2341, firstActive: "2025-12-15", uptimePercent: 97.8, totalErrors: 82,
      recentEvents: [
        { type: "warning", message: "Queue depth exceeding threshold", timestamp: "15:23:50", details: "7 drafts pending" },
        { type: "info", message: "Draft request received", timestamp: "15:23:48", details: "Reply to MJH Construction" },
        { type: "success", message: "Draft delivered", timestamp: "15:23:30", details: "Email to Beach 67th PM" },
      ],
      versions: [
        { version: "v1.2.0", date: "2026-01-08", changes: "Improved voice matching" },
      ],
    },

    configFiles: [
      { name: "README.md", content: "# Email Drafting Agent\n\nDrafts emails matching each employee's communication style.", type: "markdown" },
    ],

    training: { lastTrained: "2026-01-08", datasetVersion: "v1.2", accuracy: 91.5 },
    mapping: { inputSources: ["Gemini Router", "Direct User Request"], outputTargets: ["Gmail Drafts"], routingRules: 3 },
  },

  {
    id: "AGT-RISK-001",
    name: "Risk Monitor",
    description: "Monitors project risks, deadlines, budget anomalies, and potential issues",
    model: "Gemini 2.0 Flash",
    modelKey: "gemini",
    status: "live",
    lastActivity: new Date(Date.now() - 1000).toISOString(),
    currentAction: "Scanning 23 active projects for deadline risks...",
    queueDepth: 0,
    stats: { totalRequests: 5621, successRate: 99.5, avgLatency: 85, errorsToday: 1, requestsPerMinute: 4 },
    connections: ["AGT-ORCH-001", "AGT-BQ-001", "AGT-HS-001"],
    auditedBy: ["AGT-AUDIT-001"],
    schedule: "Every 15 minutes",

    permissions: {
      readAccess: [
        { resource: "BigQuery - All", scope: "Read only", enabled: true },
        { resource: "HubSpot - Jobs", scope: "Read only", enabled: true },
        { resource: "Asana - Projects", scope: "Read only", enabled: true },
      ],
      writeAccess: [
        { resource: "BigQuery - mr_agent", scope: "risk_alerts table", enabled: true },
      ],
      userSynteraction: [
        { id: "user_isaac", name: "Isaac", role: "CEO", canInitiate: false, canReceive: true },
        { id: "user_joel", name: "Joel", role: "Operations", canInitiate: false, canReceive: true },
      ],
      agentSynteraction: [
        { agentId: "AGT-ORCH-001", canCall: true, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-BQ-001", canCall: true, canReceiveFrom: false, priority: 2 },
        { agentId: "AGT-HS-001", canCall: true, canReceiveFrom: false, priority: 3 },
      ],
    },

    scoring: {
      overallScore: 97, accuracyScore: 98, latencyScore: 99, reliabilityScore: 96,
      evaluationFrequency: "Every 6 hours", lastEvaluation: "2026-01-13 12:00", nextEvaluation: "2026-01-13 18:00",
      metrics: [
        { name: "Detection Accuracy", description: "True positive rate", weight: 50, threshold: "95%" },
        { name: "False Positive Rate", description: "Incorrect alerts", weight: 30, threshold: "<5%" },
        { name: "Coverage", description: "Projects monitored", weight: 20, threshold: "100%" },
      ],
    },

    monitoring: {
      auditors: [
        { id: "user_isaac", name: "Isaac", type: "user", role: "Risk Owner", since: "2025-12-01", active: true },
        { id: "AGT-AUDIT-001", name: "Audit Agent", type: "agent", role: "Accuracy Monitoring", since: "2025-12-15", active: true },
      ],
      alerts: [
        { type: "High Risk Detected", description: "Critical risk identified", threshold: "Any", enabled: true },
        { type: "Scan Failed", description: "Risk scan incomplete", threshold: "1 failure", enabled: true },
      ],
      channels: [
        { type: "Email", target: "isaac@masterroofing.com", enabled: true },
        { type: "Slack", target: "#ko-alerts", enabled: true },
        { type: "SMS", target: "+1-xxx-xxx-xxxx", enabled: true },
      ],
    },

    history: {
      totalExecutions: 5621, firstActive: "2025-12-10", uptimePercent: 99.8, totalErrors: 28,
      recentEvents: [
        { type: "info", message: "Risk scan started", timestamp: "15:23:44", details: "23 projects" },
        { type: "success", message: "Previous scan complete", timestamp: "15:08:44", details: "0 risks detected" },
      ],
      versions: [
        { version: "v2.4.0", date: "2026-01-11", changes: "Added deadline prediction" },
      ],
    },

    configFiles: [
      { name: "README.md", content: "# Risk Monitor Agent\n\nContinuously monitors projects for risks and anomalies.", type: "markdown" },
    ],

    training: { lastTrained: "2026-01-11", datasetVersion: "v2.4", accuracy: 97.8 },
    mapping: { inputSources: ["Scheduled Scan", "Gemini Router"], outputTargets: ["Risk Alerts", "Dashboard"], routingRules: 5 },
  },

  {
    id: "AGT-AUDIT-001",
    name: "Audit Agent",
    description: "Monitors all agent activity, enforces governance, scores performance, and can pause agents",
    model: "Claude Sonnet",
    modelKey: "claude",
    status: "live",
    lastActivity: new Date().toISOString(),
    currentAction: "Auditing AGT-EMAIL-001 queue depth... WARNING: backlog detected",
    queueDepth: 0,
    stats: { totalRequests: 45210, successRate: 99.9, avgLatency: 45, errorsToday: 0, requestsPerMinute: 50 },
    connections: ["AGT-ORCH-001", "AGT-BQ-001", "AGT-HS-001", "AGT-EMAIL-001", "AGT-RISK-001"],
    auditedBy: [], // The auditor audits itself
    schedule: "Always On - Real-time",

    permissions: {
      readAccess: [
        { resource: "All Agent Logs", scope: "Full access", enabled: true },
        { resource: "All Agent Configs", scope: "Full access", enabled: true },
        { resource: "BigQuery - mr_agent", scope: "All tables", enabled: true },
      ],
      writeAccess: [
        { resource: "BigQuery - mr_agent", scope: "audit_logs, scores, violations", enabled: true },
        { resource: "Agent Configs", scope: "Emergency disable only", enabled: true },
      ],
      userSynteraction: [
        { id: "user_isaac", name: "Isaac", role: "CEO", canInitiate: false, canReceive: true },
      ],
      agentSynteraction: [
        { agentId: "AGT-ORCH-001", canCall: true, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-BQ-001", canCall: true, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-HS-001", canCall: true, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-EMAIL-001", canCall: true, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-RISK-001", canCall: true, canReceiveFrom: true, priority: 1 },
      ],
    },

    scoring: {
      overallScore: 99, accuracyScore: 99, latencyScore: 100, reliabilityScore: 99,
      evaluationFrequency: "Continuous", lastEvaluation: "2026-01-13 15:23", nextEvaluation: "N/A - Real-time",
      metrics: [
        { name: "Coverage", description: "% of actions audited", weight: 40, threshold: "100%" },
        { name: "Latency Impact", description: "Overhead added to requests", weight: 30, threshold: "<50ms" },
        { name: "False Violations", description: "Incorrect violation flags", weight: 30, threshold: "<0.1%" },
      ],
    },

    monitoring: {
      auditors: [
        { id: "user_isaac", name: "Isaac", type: "user", role: "System Administrator", since: "2025-12-01", active: true },
        { id: "external_aeye", name: "A-EYE Platform", type: "user", role: "Platform Oversight", since: "2025-12-01", active: true },
      ],
      alerts: [
        { type: "Governance Violation", description: "Agent exceeded permissions", threshold: "Any", enabled: true },
        { type: "Audit Gap", description: "Actions not audited", threshold: ">0", enabled: true },
        { type: "Score Threshold", description: "Agent score below minimum", threshold: "<70", enabled: true },
        { type: "Agent Paused", description: "Audit agent paused another agent", threshold: "Any", enabled: true },
      ],
      channels: [
        { type: "Email", target: "isaac@masterroofing.com", enabled: true },
        { type: "Slack", target: "#ko-governance", enabled: true },
        { type: "Dashboard", target: "KO Command Center", enabled: true },
      ],
    },

    history: {
      totalExecutions: 45210, firstActive: "2025-12-15", uptimePercent: 99.99, totalErrors: 3,
      recentEvents: [
        { type: "warning", message: "AGT-EMAIL-001 queue backlog detected", timestamp: "15:23:50", details: "Recommend scaling" },
        { type: "info", message: "Audited AGT-ORCH-001 routing", timestamp: "15:23:46", details: "PASS" },
        { type: "info", message: "Audited AGT-BQ-001 query", timestamp: "15:23:42", details: "PASS" },
        { type: "error", message: "AGT-PBI-001 score dropped below threshold", timestamp: "15:10:00", details: "Score: 78 (threshold: 85)" },
        { type: "warning", message: "Considering pause for AGT-PBI-001", timestamp: "15:10:01", details: "Awaiting manual review" },
      ],
      versions: [
        { version: "v3.0.0", date: "2026-01-12", changes: "Real-time scoring" },
        { version: "v2.5.0", date: "2026-01-05", changes: "Governance rules engine" },
      ],
    },

    configFiles: [
      { name: "README.md", content: "# Audit Agent\n\nCentral governance and monitoring for all KO agents.\n\n## Capabilities\n- Real-time activity monitoring\n- Performance scoring\n- Governance enforcement\n- Emergency agent pause/disable\n\n## Rules\n- Score < 70 = Pause agent, notify admin\n- Score < 85 = Warning, increase monitoring\n- Governance violation = Immediate pause", type: "markdown" },
    ],

    training: { lastTrained: "2026-01-12", datasetVersion: "v3.0", accuracy: 99.5 },
    mapping: { inputSources: ["All Agent Activity Streams"], outputTargets: ["Audit Logs", "Governance Dashboard", "Alert System"], routingRules: 0 },
  },

  {
    id: "AGT-SALES-001",
    name: "Sales Agent",
    description: "Answers CEO sales questions - bid volume, top performers, GC analysis, pipeline status, win rates",
    model: "Gemini 2.0 Flash",
    modelKey: "gemini",
    status: "live",
    lastActivity: new Date().toISOString(),
    currentAction: "Analyzing GC win rates for Q1...",
    queueDepth: 0,
    stats: { totalRequests: 426, successRate: 98.5, avgLatency: 280, errorsToday: 0, requestsPerMinute: 2 },
    connections: ["AGT-ORCH-001", "AGT-BQ-001"],
    auditedBy: ["AGT-AUDIT-001"],
    schedule: "Always On",

    permissions: {
      readAccess: [
        { resource: "BigQuery - sales_events", scope: "All tables", enabled: true },
        { resource: "BigQuery - gc_metrics", scope: "All tables", enabled: true },
        { resource: "BigQuery - proposals", scope: "Read only", enabled: true },
      ],
      writeAccess: [
        { resource: "BigQuery - agent_logs", scope: "sales_agent_logs", enabled: true },
      ],
      userSynteraction: [
        { id: "user_isaac", name: "Isaac", role: "CEO", canInitiate: true, canReceive: true },
      ],
      agentSynteraction: [
        { agentId: "AGT-ORCH-001", canCall: false, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-BQ-001", canCall: true, canReceiveFrom: true, priority: 2 },
      ],
    },

    scoring: {
      overallScore: 84.5, accuracyScore: 85, latencyScore: 78, reliabilityScore: 92,
      evaluationFrequency: "Daily", lastEvaluation: "2026-01-15 03:30", nextEvaluation: "2026-01-16 03:30",
      metrics: [
        { name: "Completeness", description: "All required elements present", weight: 25, threshold: "75%" },
        { name: "Accuracy", description: "Data correctness", weight: 25, threshold: "80%" },
        { name: "Actionability", description: "Provides actionable insights", weight: 20, threshold: "70%" },
        { name: "Context", description: "Includes benchmarks/comparisons", weight: 15, threshold: "60%" },
        { name: "Formatting", description: "Clear, readable output", weight: 15, threshold: "70%" },
      ],
    },

    monitoring: {
      auditors: [
        { id: "AGT-AUDIT-001", name: "Audit Agent", type: "agent", role: "Quality Monitoring", since: "2026-01-15", active: true },
      ],
      alerts: [
        { type: "Score Drop", description: "Score below threshold", threshold: "<75", enabled: true },
        { type: "Accuracy Alert", description: "Data accuracy issues", threshold: "<80%", enabled: true },
      ],
      channels: [
        { type: "Dashboard", target: "Sales Intelligence Dashboard", enabled: true },
      ],
    },

    history: {
      totalExecutions: 426, firstActive: "2026-01-15", uptimePercent: 99.5, totalErrors: 6,
      recentEvents: [
        { type: "success", message: "Answered: How much did we bid this month?", timestamp: "03:30:55", details: "Score: 92" },
        { type: "success", message: "Answered: Who's our top performer?", timestamp: "03:30:52", details: "Score: 82" },
        { type: "success", message: "Answered: Which GCs should we focus on?", timestamp: "03:30:48", details: "Score: 85" },
      ],
      versions: [
        { version: "v1.0.0", date: "2026-01-15", changes: "Initial release with 10 CEO questions" },
      ],
    },

    configFiles: [
      { name: "README.md", content: "# Sales Agent\n\nAnswers CEO-level sales questions using BigQuery data.\n\n## 10 CEO Questions\n1. How much did we bid this month?\n2. Who's our top performer?\n3. Which GCs should we focus on?\n4. Are we responding fast enough?\n5. What's in the pipeline?\n6. Who's been slow on turnaround?\n7. How are we doing vs last month?\n8. Which GCs should we stop bidding?\n9. What's our average job size?\n10. How many RFPs this week?\n\n## Scoring: 84.5/100 (100% pass rate)", type: "markdown" },
    ],

    training: { lastTrained: "2026-01-15", datasetVersion: "v1.0", accuracy: 84.5 },
    mapping: { inputSources: ["CEO Chat", "Gemini Router"], outputTargets: ["Sales Dashboard", "CEO Response"], routingRules: 10 },
  },

  {
    id: "AGT-TRAIN-001",
    name: "Faigy Knowledge Trainer",
    description: "Continuous training system for Faigy Assistant - tests Q&A accuracy, auto-tunes thresholds, tracks experiments",
    model: "Embedding + Rules",
    modelKey: "custom",
    status: "idle",
    lastActivity: new Date().toISOString(),
    currentAction: "Ready for training batch...",
    queueDepth: 0,
    stats: {
      totalRequests: 0,
      successRate: 95.0,
      avgLatency: 250,
      errorsToday: 0,
      requestsPerMinute: 0,
      // Custom training stats
      totalQAPairs: 6383,
      testableQAPairs: 5935,
      lastBatchPassRate: 95.0,
      experimentsRun: 0,
    },
    connections: ["AGT-ORCH-001"],
    auditedBy: ["AGT-AUDIT-001"],
    schedule: "Manual / Scheduled",

    permissions: {
      readAccess: [
        { resource: "Q&A Embeddings", scope: "qa_embeddings.json (6,383 pairs)", enabled: true },
        { resource: "Training Config", scope: "faigy_config.json", enabled: true },
        { resource: "Training Logs", scope: "faigy_training_logs/", enabled: true },
      ],
      writeAccess: [
        { resource: "Training Config", scope: "Threshold adjustments", enabled: true },
        { resource: "Training Logs", scope: "Results, experiments", enabled: true },
        { resource: "Tuning Insights", scope: "tuning_insights.json", enabled: true },
      ],
      userSynteraction: [
        { id: "user_isaac", name: "Isaac", role: "CEO", canInitiate: true, canReceive: true },
      ],
      agentSynteraction: [
        { agentId: "AGT-ORCH-001", canCall: false, canReceiveFrom: true, priority: 1 },
        { agentId: "AGT-AUDIT-001", canCall: false, canReceiveFrom: true, priority: 1 },
      ],
    },

    scoring: {
      overallScore: 95,
      accuracyScore: 95,
      latencyScore: 92,
      reliabilityScore: 98,
      evaluationFrequency: "Per Batch",
      lastEvaluation: "2026-01-19 09:00",
      nextEvaluation: "On demand",
      metrics: [
        { name: "Pass Rate", description: "Questions answered correctly", weight: 40, threshold: "90%" },
        { name: "Category Coverage", description: "Categories with >70% pass rate", weight: 25, threshold: "85%" },
        { name: "Answer Similarity", description: "Semantic match to expected", weight: 20, threshold: "60%" },
        { name: "Auto-Tune Effectiveness", description: "Improvement after tuning", weight: 15, threshold: "+2%" },
      ],
    },

    monitoring: {
      auditors: [
        { id: "user_isaac", name: "Isaac", type: "user", role: "Training Owner", since: "2026-01-19", active: true },
        { id: "AGT-AUDIT-001", name: "Audit Agent", type: "agent", role: "Quality Monitoring", since: "2026-01-19", active: true },
      ],
      alerts: [
        { type: "Pass Rate Drop", description: "Pass rate below threshold", threshold: "<85%", enabled: true },
        { type: "Category Failure", description: "Category pass rate critical", threshold: "<50%", enabled: true },
        { type: "Data Quality Issue", description: "Flagged Q&A pairs detected", threshold: ">10", enabled: true },
      ],
      channels: [
        { type: "Dashboard", target: "KO Command Center", enabled: true },
        { type: "Slack", target: "#ko-training", enabled: false },
      ],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2026-01-19",
      uptimePercent: 100,
      totalErrors: 0,
      recentEvents: [
        { type: "info", message: "Agent initialized", timestamp: "09:00:00", details: "6,383 Q&A pairs loaded" },
      ],
      versions: [
        { version: "v1.0.0", date: "2026-01-19", changes: "Initial release with trainer + tuner" },
      ],
    },

    configFiles: [
      {
        name: "README.md",
        content: `# Faigy Knowledge Trainer

Continuous test/train system for Faigy Assistant Q&A.

## Components
- **Trainer** (faigy_trainer.py): Runs test batches against 6,383 Q&A pairs
- **Tuner** (faigy_tuner.py): Analyzes failures, suggests/applies threshold adjustments
- **Evaluator** (faigy_eval.py): Dashboard view of results and metrics

## Features
- Category-specific threshold tuning
- Failure pattern analysis (WHY things fail, not just WHAT)
- Data quality detection (vague answers, mislabels)
- Experiment tracking with rollback
- Auto-tuning with confidence scores

## Usage
\`\`\`bash
# Run test batch
python3 faigy_trainer.py --batch-size 50

# Run with auto-analysis
python3 faigy_trainer.py --auto-tune

# See suggestions
python3 faigy_tuner.py suggest

# Apply high-confidence adjustments
python3 faigy_tuner.py apply
\`\`\`

## Current Stats
- Q&A Pairs: 6,383
- Testable: 5,935
- Pass Rate: ~95%
- Categories: 18`,
        type: "markdown"
      },
    ],

    // Custom training-specific data
    trainingConfig: {
      batchSize: 50,
      continuousMode: false,
      autoTuneEnabled: false,
      autoTuneApply: false,
      schedule: null, // cron expression
      lastRun: null,
      nextRun: null,
    },

    trainingMetrics: {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      passRate: 0,
      categoryStats: {},
      weakCategories: [],
      failurePatterns: {},
      dataQualityIssues: {
        vagueAnswers: 0,
        tooShortAnswers: 0,
        potentialMislabels: 0,
      },
    },

    experiments: {
      total: 0,
      applied: 0,
      rolledBack: 0,
      pending: [],
      history: [],
    },

    dataSources: [
      { id: "qa_embeddings", name: "Q&A Embeddings", path: "/home/iwagschal/qa_embeddings.json", pairs: 6383, active: true },
    ],

    training: { lastTrained: "2026-01-19", datasetVersion: "v1.0", accuracy: 95.0 },
    mapping: {
      inputSources: ["Q&A Dataset", "Manual Trigger", "Scheduled"],
      outputTargets: ["Training Logs", "Config Updates", "Insights"],
      routingRules: 0
    },
  },
]

// Helper function to get agent by ID
export function getAgentById(id) {
  return agents.find(a => a.id === id)
}

// Helper function to get agents by status
export function getAgentsByStatus(status) {
  return agents.filter(a => a.status === status)
}

// Helper to get all connections for network map
export function getAllConnections() {
  const connections = []

  agents.forEach(agent => {
    // Query/data flow connections
    agent.permissions?.agentSynteraction?.forEach(synteract => {
      if (synteract.canCall) {
        connections.push({
          from: agent.id,
          to: synteract.agentId,
          type: "query",
          bidirectional: synteract.canReceiveFrom,
        })
      }
    })

    // Audit connections
    agent.auditedBy?.forEach(auditorId => {
      connections.push({
        from: auditorId,
        to: agent.id,
        type: "audit",
        bidirectional: false,
      })
    })
  })

  return connections
}

// Helper to detect bottlenecks (agents with high queue depth)
export function getBottlenecks(threshold = 5) {
  return agents.filter(a => a.queueDepth >= threshold)
}

// Helper to get agents with errors or paused status
export function getProblemAgents() {
  return agents.filter(a => a.status === "error" || a.status === "paused")
}
