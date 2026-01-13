/**
 * REAL Agent Data - Master Roofing Multi-Agent System
 *
 * This file contains the actual agents running in production at 34.95.128.208
 * Data extracted from:
 * - /home/iwagschal/gemini_orchestrator_v2.py
 * - /home/iwagschal/chief_agent_v2.py
 * - /home/iwagschal/claude_sql_v2.py
 * - /home/iwagschal/vertex_search_v2.py
 * - /home/iwagschal/hubspot_v2.py
 * - /home/iwagschal/powerbi_v2.py
 */

// Status configuration with colors
export const statusConfig = {
  live: {
    label: "LIVE",
    color: "bg-emerald-500",
    pulseColor: "bg-emerald-400",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500",
    animation: "animate-pulse",
    description: "Actively processing",
  },
  idle: {
    label: "IDLE",
    color: "bg-amber-500",
    pulseColor: "bg-amber-400",
    textColor: "text-amber-400",
    borderColor: "border-amber-500",
    animation: "",
    opacity: "opacity-60",
    description: "Ready, awaiting request",
  },
  error: {
    label: "ERROR",
    color: "bg-red-500",
    pulseColor: "bg-red-400",
    textColor: "text-red-400",
    borderColor: "border-red-500",
    animation: "animate-pulse",
    description: "Failed, needs attention",
  },
  paused: {
    label: "PAUSED",
    color: "bg-purple-500",
    pulseColor: "bg-purple-400",
    textColor: "text-purple-400",
    borderColor: "border-purple-500",
    animation: "",
    description: "Paused by auditor",
  },
  offline: {
    label: "OFFLINE",
    color: "bg-gray-500",
    pulseColor: "bg-gray-400",
    textColor: "text-gray-400",
    borderColor: "border-gray-500",
    animation: "",
    opacity: "opacity-40",
    description: "Disabled or stopped",
  },
}

// Connection types for network visualization
export const connectionTypes = {
  data: { color: "#3b82f6", label: "Data Flow" },
  control: { color: "#8b5cf6", label: "Control Signal" },
  audit: { color: "#f59e0b", label: "Audit" },
  sync: { color: "#10b981", label: "Sync" },
}

// Model configuration for icons
export const modelConfig = {
  gemini: {
    name: "Google Gemini",
    color: "#4285F4",
    icon: "G",
  },
  claude: {
    name: "Anthropic Claude",
    color: "#D97706",
    icon: "C",
  },
  openai: {
    name: "OpenAI GPT",
    color: "#10A37F",
    icon: "O",
  },
  vertex: {
    name: "Vertex AI",
    color: "#EA4335",
    icon: "V",
  },
  custom: {
    name: "Custom Model",
    color: "#6B7280",
    icon: "?",
  },
}

// ============================================================================
// REAL AGENT PROMPTS (extracted from production code)
// ============================================================================

const PROMPTS = {
  // Gemini Orchestrator - Project Resolver
  PROJECT_RESOLVER: `You are analyzing a user's question to identify any PROJECT NAMES mentioned.

Your job is to extract project name mentions that refer to roofing/construction projects.
Projects are typically identified by:
- Street addresses (e.g., "203 Sutter", "1451 Sutter Ave", "261 Grand Concourse")
- Building names (e.g., "Empire State Building", "Brooklyn Heights Tower")
- Project codes or numbers

IMPORTANT:
- Extract the project names EXACTLY as the user wrote them
- If the user mentions multiple projects, extract ALL of them
- If no specific project is mentioned, return an empty list
- Do NOT invent project names - only extract what's explicitly mentioned

Return JSON only with this structure:
{
  "project_mentions": ["project name 1", "project name 2"],
  "reasoning": "brief explanation of what you found"
}`,

  // Gemini Orchestrator - Router
  ROUTER: `You are the CAO (Chief Agent Orchestrator) for a roofing intelligence system.

Your job is to analyze the user's question and select the best tools to answer it.
Tool selection MUST be based on reasoning, not keyword matching.

AVAILABLE TOOLS:
- hubspot: CRM truth for deals, pipelines, contacts, companies, engagement activity.
  Best for RECENT data (latest updates, last 7-30 days, most recently changed).
- claude_sql: Generates SQL for analytics using BigQuery tables.
  Best for HISTORICAL, aggregated, longitudinal, KPI, trends, cohort analysis.
- vertex_search: Searches documents such as SOPs, handbooks, internal policies, guides.
  Best for questions answered from text/document knowledge rather than metrics.
- powerbi: Use ONLY when user explicitly requests a new visualization/chart/dashboard
  OR when a chart is clearly needed to communicate results.

ROUTING RULES:
1) If the user asks for general summaries or policies, instructions, SOPs: prefer vertex_search.
2) If the user asks for trends over time, historical summaries: prefer claude_sql.
3) If the user asks for "latest", "recent", changes, updates: prefer hubspot
4) If the request requires BOTH CRM recency and historical/trend analysis, return BOTH tools.
5) ALWAYS return a confidence score 0-1.`,

  // Gemini Orchestrator - Merge Results
  MERGE_RESULTS: `You are the CAO (Chief Agent Orchestrator) merging results from multiple data sources.

Your task is to combine the tool outputs into a coherent summary that the CEO Front Agent can use to compose the final user response.

INSTRUCTIONS:
1. Synthesize information from all sources
2. Highlight key findings and metrics
3. Note any conflicts or discrepancies between sources
4. Structure the summary logically
5. Do NOT compose the final user response - just provide a structured summary`,

  // CEO Response Agent
  CEO_RESPONSE: `You are the CEO's executive assistant providing clear, professional insights.

Your role is to compose a helpful, conversational response for the CEO based on:
1. The merged summary from data sources (provided below)
2. Key metrics and insights extracted

GUIDELINES:
- Be concise but thorough
- Use natural, professional language
- Highlight the most important findings first
- If data is incomplete, acknowledge it gracefully
- Format numbers clearly (use commas, round appropriately)
- Use bullet points for multiple items when appropriate`,

  // Claude SQL Agent
  CLAUDE_SQL: `You are a BigQuery SQL expert for a roofing intelligence system.
Generate ONLY valid BigQuery SQL queries.

<available_tables>
## Primary Table: v_project_intelligence_full (AI-ready denormalized view)
Full path: \`master-roofing-intelligence.mr_agent.v_project_intelligence_full\`

Columns:
- project_id (STRING, PRIMARY KEY): Unique identifier
- project_name (STRING): Project name/address
- gc_name (STRING): General Contractor name
- gc_email, gc_contact (STRING): GC contact info
- award_status (STRING): WON, PENDING, LOST, NULL
- proposal_total (FLOAT): Proposal value in dollars
- takeoff_total (FLOAT): Takeoff estimate in dollars
- financial_total_costs, financial_total_revenue, financial_net_amount (FLOAT)
- profit_margin_pct (FLOAT)
- lifecycle_stage (STRING): PROPOSED, IN_PROGRESS, BILLING, AWARDED
- data_richness_score (INT): 0-7 score of data completeness

## Document Index: v_document_index
## Project Lookup: v_project_lookup
</available_tables>

<query_guidelines>
1. Use v_project_intelligence_full for most queries
2. Always use the full table path with backticks
3. Use LOWER() for text searches
4. Add LIMIT clause for safety (default 100)
5. Round money values with ROUND(x, 2)
</query_guidelines>

Return ONLY raw SQL - no markdown, no explanations.`,

  // HubSpot Agent
  HUBSPOT: `You are a HubSpot CRM query expert. Generate search parameters for the HubSpot API.

<available_objects>
1. deals - Sales deals/opportunities
   Common properties: dealname, amount, dealstage, closedate, pipeline, mr_project_id

2. contacts - Individual people
   Common properties: firstname, lastname, email, phone, company, jobtitle

3. companies - Organizations
   Common properties: name, domain, industry, city, state, country
</available_objects>

<filter_operators>
- EQ: equals (exact match)
- CONTAINS_TOKEN: contains word/phrase
- IN: in list
- GTE/LTE: greater/less than or equal
</filter_operators>`,
}

// ============================================================================
// REAL AGENTS - Production Configuration
// ============================================================================

export const agents = [
  // ========== ORCHESTRATOR ==========
  {
    id: "CAO-GEM-001",
    name: "Gemini Orchestrator",
    description: "Chief Agent Orchestrator (CAO) - The brain that decides which tools to use and how to combine outputs. Handles project resolution, intent classification, tool routing, and result merging.",
    modelKey: "gemini",
    model: "gemini-2.0-flash",
    provider: "Google Vertex AI",
    status: "live",
    role: "orchestrator",
    phase: "0,1,3",

    // Live stats (will be populated from API)
    stats: {
      totalRequests: 0,
      successRate: 98.5,
      avgLatency: 450,
      errorsToday: 0,
      requestsPerMinute: 0,
    },

    queueDepth: 0,
    lastActivity: new Date().toISOString(),
    currentAction: "Routing queries and resolving projects",

    // Real prompts from gemini_orchestrator_v2.py
    configFiles: [
      {
        name: "system_prompt.md",
        type: "markdown",
        content: `# Gemini Orchestrator (CAO)

## Role
Chief Agent Orchestrator for Master Roofing intelligence system.

## Responsibilities
- **Phase 0**: Project Resolution - Extract project mentions, resolve to project_ids via BigQuery
- **Phase 1**: Query Routing - Decide which tools to call based on user intent
- **Phase 3**: Result Merging - Combine tool outputs into coherent summary

## Model
- Provider: Google Vertex AI
- Model: gemini-2.0-flash
- Temperature: 0.1 (low for consistent routing)
- Max Tokens: 1024

## Prompts
### Project Resolver Prompt
${PROMPTS.PROJECT_RESOLVER}

### Router Prompt
${PROMPTS.ROUTER}

### Merge Results Prompt
${PROMPTS.MERGE_RESULTS}
`,
      },
    ],

    // Real permissions
    permissions: {
      readAccess: [
        "BigQuery: mr_agent.v_project_lookup",
        "BigQuery: mr_agent.v_project_intelligence_full",
      ],
      writeAccess: [],
      apiAccess: [
        "Google Vertex AI (Gemini)",
      ],
      agentCalls: [
        "CAO-SQL-001 (Claude SQL)",
        "CAO-VTX-001 (Vertex Search)",
        "CAO-HUB-001 (HubSpot)",
        "CAO-PBI-001 (Power BI)",
      ],
    },

    // Communication - who this agent talks to
    connections: [
      { targetId: "CAO-SQL-001", type: "control", label: "Routes SQL queries" },
      { targetId: "CAO-VTX-001", type: "control", label: "Routes doc searches" },
      { targetId: "CAO-HUB-001", type: "control", label: "Routes CRM queries" },
      { targetId: "CAO-PBI-001", type: "control", label: "Routes viz requests" },
      { targetId: "CAO-CEO-001", type: "data", label: "Sends merged results" },
    ],

    auditedBy: ["CAO-AUD-001"],

    scoring: {
      overallScore: 95,
      accuracyScore: 97,
      latencyScore: 92,
      reliabilityScore: 98,
      metrics: [
        { name: "Routing Accuracy", weight: 40, score: 97 },
        { name: "Project Resolution", weight: 30, score: 96 },
        { name: "Response Time", weight: 20, score: 92 },
        { name: "Error Rate", weight: 10, score: 99 },
      ],
    },

    monitoring: {
      auditors: ["CAO-AUD-001"],
      alerts: [
        { type: "latency", threshold: 2000, action: "warn" },
        { type: "error_rate", threshold: 5, action: "alert" },
      ],
      channels: ["#ko-alerts", "isaac@masterroofingus.com"],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2026-01-01",
      uptimePercent: 99.9,
      totalErrors: 0,
      recentEvents: [],
      versions: [
        { version: "v2.0.0", date: "2026-01-01", changes: "Added project resolution (Phase 0)" },
        { version: "v1.0.0", date: "2025-12-15", changes: "Initial Gemini orchestrator" },
      ],
    },
  },

  // ========== CEO RESPONSE AGENT ==========
  {
    id: "CAO-CEO-001",
    name: "CEO Response Agent",
    description: "Composes the final human-facing response for the CEO. Only handles Phase 4 - transforming merged data into natural language.",
    modelKey: "openai",
    model: "gpt-4o-mini",
    provider: "OpenAI",
    status: "live",
    role: "responder",
    phase: "4",

    stats: {
      totalRequests: 0,
      successRate: 99.2,
      avgLatency: 800,
      errorsToday: 0,
      requestsPerMinute: 0,
    },

    queueDepth: 0,
    lastActivity: new Date().toISOString(),
    currentAction: "Composing CEO responses",

    configFiles: [
      {
        name: "system_prompt.md",
        type: "markdown",
        content: `# CEO Response Agent

## Role
Final response composer for the CEO.

## Model
- Provider: OpenAI
- Model: gpt-4o-mini

## System Prompt
${PROMPTS.CEO_RESPONSE}

## Guidelines
- Be concise but thorough
- Use natural, professional language
- Highlight the most important findings first
- Format numbers clearly (use commas, round appropriately)
`,
      },
    ],

    permissions: {
      readAccess: [],
      writeAccess: [],
      apiAccess: ["OpenAI API"],
      agentCalls: [],
    },

    connections: [
      { targetId: "CAO-GEM-001", type: "data", label: "Receives merged data" },
    ],

    auditedBy: ["CAO-AUD-001"],

    scoring: {
      overallScore: 94,
      accuracyScore: 95,
      latencyScore: 90,
      reliabilityScore: 98,
      metrics: [
        { name: "Response Quality", weight: 50, score: 95 },
        { name: "Tone Accuracy", weight: 25, score: 94 },
        { name: "Response Time", weight: 15, score: 90 },
        { name: "Error Rate", weight: 10, score: 99 },
      ],
    },

    monitoring: {
      auditors: ["CAO-AUD-001"],
      alerts: [
        { type: "latency", threshold: 3000, action: "warn" },
      ],
      channels: ["#ko-alerts"],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2025-12-15",
      uptimePercent: 99.8,
      totalErrors: 0,
      recentEvents: [],
      versions: [
        { version: "v1.1.0", date: "2026-01-01", changes: "Added resolved projects context" },
        { version: "v1.0.0", date: "2025-12-15", changes: "Initial CEO response agent" },
      ],
    },
  },

  // ========== CLAUDE SQL AGENT ==========
  {
    id: "CAO-SQL-001",
    name: "Claude SQL Agent",
    description: "Generates BigQuery SQL from natural language questions. Enforces project_id filtering when projects are resolved.",
    modelKey: "claude",
    model: "claude-sonnet-4-20250514",
    provider: "Anthropic",
    status: "live",
    role: "tool",
    phase: "2",

    stats: {
      totalRequests: 0,
      successRate: 96.8,
      avgLatency: 1200,
      errorsToday: 0,
      requestsPerMinute: 0,
    },

    queueDepth: 0,
    lastActivity: new Date().toISOString(),
    currentAction: "Generating SQL queries",

    configFiles: [
      {
        name: "system_prompt.md",
        type: "markdown",
        content: `# Claude SQL Agent

## Role
BigQuery SQL generator for analytics queries.

## Model
- Provider: Anthropic
- Model: claude-sonnet-4-20250514
- Max Tokens: 2000

## System Prompt
${PROMPTS.CLAUDE_SQL}

## Available Tables
- \`mr_agent.v_project_intelligence_full\` - Primary denormalized view (2,160 projects)
- \`mr_agent.v_document_index\` - Document GCS paths (17,260 docs)
- \`mr_agent.v_project_lookup\` - Lean lookup view

## Critical Rules
- ALWAYS filter by project_id when provided
- Use LIMIT clause for safety
- Round money values with ROUND(x, 2)
`,
      },
    ],

    permissions: {
      readAccess: [
        "BigQuery: mr_agent.v_project_intelligence_full",
        "BigQuery: mr_agent.v_document_index",
        "BigQuery: mr_agent.v_project_lookup",
        "BigQuery: mr_agent.v_pbi_* (all Power BI views)",
        "BigQuery: mr_agent.v_ceo_* (CEO KPI views)",
      ],
      writeAccess: [],
      apiAccess: ["Anthropic API", "BigQuery API"],
      agentCalls: [],
    },

    connections: [
      { targetId: "CAO-GEM-001", type: "data", label: "Returns SQL results" },
    ],

    auditedBy: ["CAO-AUD-001"],

    scoring: {
      overallScore: 92,
      accuracyScore: 94,
      latencyScore: 88,
      reliabilityScore: 96,
      metrics: [
        { name: "SQL Accuracy", weight: 40, score: 94 },
        { name: "Query Efficiency", weight: 25, score: 90 },
        { name: "Response Time", weight: 20, score: 88 },
        { name: "Error Handling", weight: 15, score: 96 },
      ],
    },

    monitoring: {
      auditors: ["CAO-AUD-001"],
      alerts: [
        { type: "query_timeout", threshold: 30000, action: "alert" },
        { type: "syntax_error", threshold: 3, action: "warn" },
      ],
      channels: ["#ko-alerts"],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2025-12-15",
      uptimePercent: 99.5,
      totalErrors: 0,
      recentEvents: [],
      versions: [
        { version: "v2.0.0", date: "2026-01-01", changes: "Added project_id filtering" },
        { version: "v1.0.0", date: "2025-12-15", changes: "Initial SQL generator" },
      ],
    },
  },

  // ========== VERTEX SEARCH AGENT ==========
  {
    id: "CAO-VTX-001",
    name: "Vertex Search Agent",
    description: "Searches documents using Vertex AI Discovery Engine or BigQuery document index. Returns proposals, takeoffs, and policy documents.",
    modelKey: "vertex",
    model: "Vertex AI Discovery Engine",
    provider: "Google Cloud",
    status: "live",
    role: "tool",
    phase: "2",

    stats: {
      totalRequests: 0,
      successRate: 97.5,
      avgLatency: 600,
      errorsToday: 0,
      requestsPerMinute: 0,
    },

    queueDepth: 0,
    lastActivity: new Date().toISOString(),
    currentAction: "Searching documents",

    configFiles: [
      {
        name: "system_prompt.md",
        type: "markdown",
        content: `# Vertex Search Agent

## Role
Document search using Vertex AI Discovery Engine and BigQuery document index.

## Search Modes
1. **Project-Specific**: When project_ids provided, queries v_document_index
2. **Full-Text**: When no project_ids, uses Vertex AI Search for SOPs, handbooks, guides

## Data Sources
- BigQuery: mr_agent.v_document_index (17,260 documents)
- GCS: gs://mr-agent-docs-us-east4/proposals/
- GCS: gs://mr-agent-docs-us-east4/takeoffs/
- Vertex Search Engine: mr-agent-docs-search_1765860810364

## Document Types
- Proposals (PDF)
- Takeoffs (Excel/CSV)
- SOPs and Handbooks
- Policy Documents
`,
      },
    ],

    permissions: {
      readAccess: [
        "BigQuery: mr_agent.v_document_index",
        "GCS: gs://mr-agent-docs-us-east4/proposals/*",
        "GCS: gs://mr-agent-docs-us-east4/takeoffs/*",
        "GCS: gs://mr-agent-docs-us-east4/manifests/*",
        "Vertex AI Search: mr-agent-docs-search_1765860810364",
      ],
      writeAccess: [],
      apiAccess: ["Vertex AI Discovery Engine", "BigQuery API", "GCS API"],
      agentCalls: [],
    },

    connections: [
      { targetId: "CAO-GEM-001", type: "data", label: "Returns documents" },
    ],

    auditedBy: ["CAO-AUD-001"],

    scoring: {
      overallScore: 93,
      accuracyScore: 95,
      latencyScore: 94,
      reliabilityScore: 92,
      metrics: [
        { name: "Search Relevance", weight: 40, score: 95 },
        { name: "Document Coverage", weight: 25, score: 90 },
        { name: "Response Time", weight: 20, score: 94 },
        { name: "Availability", weight: 15, score: 92 },
      ],
    },

    monitoring: {
      auditors: ["CAO-AUD-001"],
      alerts: [
        { type: "no_results", threshold: 5, action: "warn" },
        { type: "gcs_error", threshold: 1, action: "alert" },
      ],
      channels: ["#ko-alerts"],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2025-12-15",
      uptimePercent: 99.2,
      totalErrors: 0,
      recentEvents: [],
      versions: [
        { version: "v2.0.0", date: "2026-01-01", changes: "Added project_id filtering via v_document_index" },
        { version: "v1.0.0", date: "2025-12-15", changes: "Initial Vertex Search integration" },
      ],
    },
  },

  // ========== HUBSPOT AGENT ==========
  {
    id: "CAO-HUB-001",
    name: "HubSpot CRM Agent",
    description: "Searches HubSpot CRM for deals, contacts, and companies. Uses OpenAI to generate intelligent search parameters. Supports mr_project_id filtering.",
    modelKey: "openai",
    model: "gpt-4o-mini",
    provider: "OpenAI + HubSpot",
    status: "live",
    role: "tool",
    phase: "2",

    stats: {
      totalRequests: 0,
      successRate: 95.0,
      avgLatency: 900,
      errorsToday: 0,
      requestsPerMinute: 0,
    },

    queueDepth: 0,
    lastActivity: new Date().toISOString(),
    currentAction: "Querying CRM",

    configFiles: [
      {
        name: "system_prompt.md",
        type: "markdown",
        content: `# HubSpot CRM Agent

## Role
Intelligent CRM search using HubSpot API with OpenAI-generated queries.

## Model (Query Generation)
- Provider: OpenAI
- Model: gpt-4o-mini

## System Prompt
${PROMPTS.HUBSPOT}

## CRM Objects
- **Deals**: dealname, amount, dealstage, closedate, pipeline, mr_project_id
- **Contacts**: firstname, lastname, email, phone, company
- **Companies**: name, domain, industry, city

## Project Linking
Uses custom property \`mr_project_id\` to link HubSpot deals to MR projects.
`,
      },
    ],

    permissions: {
      readAccess: [
        "HubSpot: Deals (read)",
        "HubSpot: Contacts (read)",
        "HubSpot: Companies (read)",
      ],
      writeAccess: [],
      apiAccess: ["OpenAI API", "HubSpot API"],
      agentCalls: [],
    },

    connections: [
      { targetId: "CAO-GEM-001", type: "data", label: "Returns CRM data" },
    ],

    auditedBy: ["CAO-AUD-001"],

    scoring: {
      overallScore: 90,
      accuracyScore: 92,
      latencyScore: 88,
      reliabilityScore: 91,
      metrics: [
        { name: "Query Accuracy", weight: 40, score: 92 },
        { name: "Data Freshness", weight: 25, score: 95 },
        { name: "Response Time", weight: 20, score: 88 },
        { name: "API Reliability", weight: 15, score: 91 },
      ],
    },

    monitoring: {
      auditors: ["CAO-AUD-001"],
      alerts: [
        { type: "api_error", threshold: 3, action: "alert" },
        { type: "rate_limit", threshold: 1, action: "warn" },
      ],
      channels: ["#ko-alerts"],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2025-12-15",
      uptimePercent: 98.5,
      totalErrors: 0,
      recentEvents: [],
      versions: [
        { version: "v2.0.0", date: "2026-01-01", changes: "Added mr_project_id filtering" },
        { version: "v1.0.0", date: "2025-12-15", changes: "Initial HubSpot integration" },
      ],
    },
  },

  // ========== POWER BI AGENT ==========
  {
    id: "CAO-PBI-001",
    name: "Power BI Dashboard Agent",
    description: "Generates custom visualizations and KPI dashboards. Queries BigQuery for live data and generates chart configurations.",
    modelKey: "claude",
    model: "claude-sonnet-4-20250514",
    provider: "Anthropic + Power BI",
    status: "live",
    role: "tool",
    phase: "2",

    stats: {
      totalRequests: 0,
      successRate: 94.0,
      avgLatency: 1500,
      errorsToday: 0,
      requestsPerMinute: 0,
    },

    queueDepth: 0,
    lastActivity: new Date().toISOString(),
    currentAction: "Generating visualizations",

    configFiles: [
      {
        name: "system_prompt.md",
        type: "markdown",
        content: `# Power BI Dashboard Agent

## Role
Custom visualization generator using BigQuery data and Power BI.

## Data Sources (BigQuery Views)
- v_pbi_kpi_summary: Live KPI metrics
- v_pbi_fact_proposal: Proposal facts
- v_pbi_gc_scorecard: GC analytics
- v_pbi_project_360: Project details
- v_pbi_fact_takeoff_agg: Takeoff metrics
- v_ceo_kpis: CEO-level KPIs
- v_ceo_stuck_jobs: Jobs stuck in pipeline
- v_ceo_at_risk: At-risk projects

## Dashboard Types
- CEO Overview: Pipeline value, win rates
- GC Analytics: Contractor performance
- Project Deep Dive: Status, timeline, risk
- Estimating: Rate cards, takeoff analysis
- Pipeline: Opportunities forecast
- Win/Loss: Conversion analysis
`,
      },
    ],

    permissions: {
      readAccess: [
        "BigQuery: mr_agent.v_pbi_kpi_summary",
        "BigQuery: mr_agent.v_pbi_fact_proposal",
        "BigQuery: mr_agent.v_pbi_gc_scorecard",
        "BigQuery: mr_agent.v_pbi_project_360",
        "BigQuery: mr_agent.v_pbi_fact_takeoff_agg",
        "BigQuery: mr_agent.v_ceo_kpis",
        "BigQuery: mr_agent.v_ceo_stuck_jobs",
        "BigQuery: mr_agent.v_ceo_at_risk",
      ],
      writeAccess: [],
      apiAccess: ["Anthropic API", "BigQuery API", "Power BI Embed API"],
      agentCalls: [],
    },

    connections: [
      { targetId: "CAO-GEM-001", type: "data", label: "Returns visualizations" },
    ],

    auditedBy: ["CAO-AUD-001"],

    scoring: {
      overallScore: 88,
      accuracyScore: 90,
      latencyScore: 82,
      reliabilityScore: 92,
      metrics: [
        { name: "Viz Accuracy", weight: 35, score: 90 },
        { name: "Data Freshness", weight: 25, score: 95 },
        { name: "Generation Time", weight: 25, score: 82 },
        { name: "Embed Success", weight: 15, score: 92 },
      ],
    },

    monitoring: {
      auditors: ["CAO-AUD-001"],
      alerts: [
        { type: "embed_failure", threshold: 2, action: "alert" },
        { type: "stale_data", threshold: 600, action: "warn" },
      ],
      channels: ["#ko-alerts"],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2025-12-15",
      uptimePercent: 97.0,
      totalErrors: 0,
      recentEvents: [],
      versions: [
        { version: "v2.0.0", date: "2026-01-07", changes: "Added CEO KPI views" },
        { version: "v1.0.0", date: "2025-12-15", changes: "Initial Power BI integration" },
      ],
    },
  },

  // ========== KO PRIME - SUPER AGENT ==========
  {
    id: "CAO-PRIME-001",
    name: "KO Prime",
    description: "Chief Intelligence Agent with full tool access. Powered by Opus 4, this super agent can autonomously query BigQuery, search documents, access HubSpot CRM, search emails, and read files from cloud storage. Mirrors Claude Code's architecture with multi-step reasoning and tool chaining.",
    modelKey: "claude",
    model: "claude-opus-4-20250514",
    provider: "Anthropic",
    status: "live",
    role: "super_agent",
    phase: "all",

    stats: {
      totalRequests: 0,
      successRate: 99.0,
      avgLatency: 2500,
      errorsToday: 0,
      requestsPerMinute: 0,
    },

    queueDepth: 0,
    lastActivity: new Date().toISOString(),
    currentAction: "Ready for complex queries",

    configFiles: [
      {
        name: "system_prompt.md",
        type: "markdown",
        content: `# KO Prime - Super Agent

## Role
Chief Intelligence Agent for Master Roofing & Siding with full data access.

## Model
- Provider: Anthropic
- Model: claude-opus-4-20250514 (Opus 4)
- Max Tokens: 4096
- Temperature: 0.3

## Available Tools
1. **bigquery_sql**: Run SQL queries against the data warehouse
2. **hubspot_query**: Query CRM for deals, contacts, companies
3. **search_documents**: Find proposals, takeoffs, and documents
4. **search_emails**: Search through email communications
5. **resolve_project**: Convert project names to canonical IDs
6. **read_gcs_file**: Read file contents from cloud storage

## Architecture
- Multi-step reasoning with up to 10 tool iterations
- Automatic tool chaining (e.g., resolve project → search documents → read file)
- Error recovery with alternative approaches

## Use Cases
- Complex business intelligence queries
- Cross-system data analysis
- Document retrieval and synthesis
- Email thread analysis
- Pipeline and project status
`,
      },
    ],

    permissions: {
      readAccess: [
        "BigQuery: mr_agent.* (all agent views)",
        "BigQuery: mr_brain.* (emails)",
        "BigQuery: raw_data.* (proposals, takeoffs)",
        "GCS: gs://mr-agent-docs-us-east4/*",
        "HubSpot: Deals, Contacts, Companies",
      ],
      writeAccess: [],
      apiAccess: [
        "Anthropic API (Opus 4)",
        "BigQuery API",
        "HubSpot API",
        "GCS API",
        "Vertex AI Search",
      ],
      agentCalls: [],
    },

    connections: [
      { targetId: "CAO-SQL-001", type: "data", label: "Uses for SQL" },
      { targetId: "CAO-VTX-001", type: "data", label: "Uses for doc search" },
      { targetId: "CAO-HUB-001", type: "data", label: "Uses for CRM" },
    ],

    auditedBy: ["CAO-AUD-001"],

    scoring: {
      overallScore: 96,
      accuracyScore: 98,
      latencyScore: 85,
      reliabilityScore: 97,
      metrics: [
        { name: "Response Quality", weight: 40, score: 98 },
        { name: "Tool Selection", weight: 25, score: 97 },
        { name: "Response Time", weight: 20, score: 85 },
        { name: "Error Recovery", weight: 15, score: 96 },
      ],
    },

    monitoring: {
      auditors: ["CAO-AUD-001"],
      alerts: [
        { type: "latency", threshold: 10000, action: "warn" },
        { type: "error_rate", threshold: 5, action: "alert" },
        { type: "tool_failure", threshold: 3, action: "warn" },
      ],
      channels: ["#ko-alerts", "isaac@masterroofingus.com"],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2026-01-13",
      uptimePercent: 100,
      totalErrors: 0,
      recentEvents: [],
      versions: [
        { version: "v1.0.0", date: "2026-01-13", changes: "Initial KO Prime super agent" },
      ],
    },
  },

  // ========== AUDIT AGENT ==========
  {
    id: "CAO-AUD-001",
    name: "System Auditor",
    description: "Monitors all agent activity, scores performance, and can pause agents if quality drops below threshold.",
    modelKey: "gemini",
    model: "gemini-2.0-flash",
    provider: "Google Vertex AI",
    status: "live",
    role: "auditor",
    phase: "all",

    stats: {
      totalRequests: 0,
      successRate: 100,
      avgLatency: 100,
      errorsToday: 0,
      requestsPerMinute: 0,
    },

    queueDepth: 0,
    lastActivity: new Date().toISOString(),
    currentAction: "Monitoring agent performance",

    configFiles: [
      {
        name: "system_prompt.md",
        type: "markdown",
        content: `# System Auditor

## Role
Performance monitoring and quality assurance for all agents.

## Responsibilities
- Monitor agent response quality
- Track latency and error rates
- Score agent outputs
- Pause agents if quality drops
- Generate audit reports

## Audit Thresholds
- Success Rate: <90% triggers warning
- Latency: >3s triggers warning
- Error Rate: >5% triggers pause
- Quality Score: <70% triggers review

## Monitored Agents
- CAO-GEM-001 (Gemini Orchestrator)
- CAO-CEO-001 (CEO Response)
- CAO-SQL-001 (Claude SQL)
- CAO-VTX-001 (Vertex Search)
- CAO-HUB-001 (HubSpot)
- CAO-PBI-001 (Power BI)
`,
      },
    ],

    permissions: {
      readAccess: [
        "All agent logs",
        "All agent metrics",
        "BigQuery: ko_audit.agent_registry",
        "BigQuery: ko_audit.agent_logs",
      ],
      writeAccess: [
        "BigQuery: ko_audit.agent_scores",
        "BigQuery: ko_audit.audit_events",
      ],
      apiAccess: ["Google Vertex AI"],
      agentCalls: [
        "CAO-GEM-001 (pause/resume)",
        "CAO-CEO-001 (pause/resume)",
        "CAO-SQL-001 (pause/resume)",
        "CAO-VTX-001 (pause/resume)",
        "CAO-HUB-001 (pause/resume)",
        "CAO-PBI-001 (pause/resume)",
      ],
    },

    connections: [
      { targetId: "CAO-GEM-001", type: "audit", label: "Audits orchestrator" },
      { targetId: "CAO-CEO-001", type: "audit", label: "Audits responses" },
      { targetId: "CAO-SQL-001", type: "audit", label: "Audits SQL" },
      { targetId: "CAO-VTX-001", type: "audit", label: "Audits search" },
      { targetId: "CAO-HUB-001", type: "audit", label: "Audits CRM" },
      { targetId: "CAO-PBI-001", type: "audit", label: "Audits dashboards" },
    ],

    auditedBy: [],

    scoring: {
      overallScore: 100,
      accuracyScore: 100,
      latencyScore: 100,
      reliabilityScore: 100,
      metrics: [
        { name: "Audit Coverage", weight: 40, score: 100 },
        { name: "Alert Accuracy", weight: 30, score: 100 },
        { name: "Response Time", weight: 20, score: 100 },
        { name: "Uptime", weight: 10, score: 100 },
      ],
    },

    monitoring: {
      auditors: [],
      alerts: [],
      channels: ["#ko-alerts", "isaac@masterroofingus.com"],
    },

    history: {
      totalExecutions: 0,
      firstActive: "2026-01-01",
      uptimePercent: 100,
      totalErrors: 0,
      recentEvents: [],
      versions: [
        { version: "v1.0.0", date: "2026-01-01", changes: "Initial audit agent" },
      ],
    },
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAgentById(id) {
  return agents.find((agent) => agent.id === id)
}

export function getAgentsByStatus(status) {
  return agents.filter((agent) => agent.status === status)
}

export function getAgentsByRole(role) {
  return agents.filter((agent) => agent.role === role)
}

export function getAllConnections() {
  const connections = []
  for (const agent of agents) {
    if (agent.connections) {
      for (const conn of agent.connections) {
        connections.push({
          sourceId: agent.id,
          targetId: conn.targetId,
          type: conn.type,
          label: conn.label,
        })
      }
    }
  }
  return connections
}

export function getBottlenecks(threshold = 5) {
  return agents.filter((agent) => agent.queueDepth >= threshold)
}

export function getProblemAgents() {
  return agents.filter(
    (agent) => agent.status === "error" || agent.status === "paused" || agent.scoring.overallScore < 80
  )
}

export function getAuditChain(agentId) {
  const agent = getAgentById(agentId)
  if (!agent) return []

  const chain = []
  for (const auditorId of agent.auditedBy || []) {
    const auditor = getAgentById(auditorId)
    if (auditor) {
      chain.push(auditor)
    }
  }
  return chain
}

// Communication flow (5-phase)
export const COMMUNICATION_FLOW = {
  phases: [
    {
      phase: 0,
      name: "Project Resolution",
      agent: "CAO-GEM-001",
      description: "Gemini extracts project mentions and resolves to project_ids",
    },
    {
      phase: 1,
      name: "Query Routing",
      agent: "CAO-GEM-001",
      description: "Gemini decides which tools to call based on intent",
    },
    {
      phase: 2,
      name: "Tool Execution",
      agents: ["CAO-SQL-001", "CAO-VTX-001", "CAO-HUB-001", "CAO-PBI-001"],
      description: "Selected tools execute with project_id filtering",
    },
    {
      phase: 3,
      name: "Result Merging",
      agent: "CAO-GEM-001",
      description: "Gemini combines tool outputs into structured summary",
    },
    {
      phase: 4,
      name: "CEO Response",
      agent: "CAO-CEO-001",
      description: "OpenAI composes final human-facing answer",
    },
  ],
}

// Backend API endpoint for live status
export const BACKEND_API = {
  baseUrl: "https://34.95.128.208",
  endpoints: {
    health: "/health",
    config: "/v1/config",
    chat: "/v1/chat",
    sessions: "/v1/sessions",
  },
}
