/**
 * API Types and Interfaces
 * Type definitions for all API requests and responses
 */

// ============================================================================
// Chat API Types
// ============================================================================

export interface ChatRequest {
  message: string;
  context?: Record<string, any>;
  session_id?: string;
}

export interface ToolTrace {
  tool?: string;
  phase?: string;
  input?: any;
  output?: any;
  status?: 'success' | 'error';
  error?: string;
  reasoning?: string;
  selected_tools?: string[];
  query_used?: Record<string, any>;
}

export interface StubMode {
  openai: boolean;
  anthropic: boolean;
  gcp: boolean;
  hubspot: boolean;
}

export interface ChatResponse {
  answer: string;
  traces: ToolTrace[];
  stub_mode: StubMode;
  session_id?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet?: string;
}


// NEW: Session types
export interface SessionSummary {
  session_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  preview: string;
}

export interface SessionListResponse {
  sessions: SessionSummary[];
  total: number;
}

export interface SessionMessage {
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    sources?: Source[];
    reasoning?: string;
    traces?: ToolTrace[];
  };
}

export interface Session {
  session_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  messages: SessionMessage[];
  metadata: Record<string, any>;
}

export interface SessionMessagesResponse {
  session_id: string;
  messages: SessionMessage[];
}

/**
 * Response from creating a new session
 */
export interface SessionCreateResponse {
  session_id: string;
  created_at: string;
}

// ============================================================================
// Vertex Search Types
// ============================================================================

export interface VertexSearchResult {
  title: string;
  snippet: string;
  url: string;
  document_id: string;
  relevance_score?: number;
}

// ============================================================================
// BigQuery Types
// ============================================================================

export interface BigQueryResult {
  [key: string]: any;
}

// ============================================================================
// HubSpot Types
// ============================================================================

export interface HubSpotResult {
  id: string;
  type: 'deal' | 'contact' | 'company';
  properties: Record<string, any>;
}

export interface HubSpotResponse {
  total: number;
  object_type?: string;
  query_used?: Record<string, any>;
  results: HubSpotResult[];
  stub?: boolean;
  error?: string;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  stub_mode: StubMode;
}

// ============================================================================
// Config Types
// ============================================================================

export interface ConfigResponse {
  model: string;
  stub_mode: StubMode;
  services_configured: {
    openai: boolean;
    anthropic: boolean;
    gcp: boolean;
    hubspot: boolean;
  };
}

// ============================================================================
// Future Endpoint Types (Placeholders)
// ============================================================================

export interface HistoryItem {
  id: string;
  message: string;
  response: string;
  timestamp: string;
  traces?: ToolTrace[];
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuthRequest {
  email?: string;
  password?: string;
  token?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

// ============================================================================
// Customer Analytics Types
// ============================================================================

export interface CustomerSystem {
  name: string;
  percentage: number;
  projects: number;
}

export interface CustomerItem {
  id: string;
  name: string;
  count: number;
  value: number;
}

export interface Customer {
  rank: number;
  name: string;
  projects: number;
  totalValue: number;
  winRate: number;
  avgProjectValue: number;
  systems: CustomerSystem[];
  topItems: CustomerItem[];
}

export interface SystemSummary {
  name: string;
  value: number;
  projects: number;
}

export interface CustomerAnalyticsTotals {
  totalCustomers: number;
  totalProjects: number;
  totalValue: number;
  avgWinRate: number;
}

export interface TopCustomersResponse {
  customers: Customer[];
  totals: CustomerAnalyticsTotals;
  systemsSummary: SystemSummary[];
}

// ============================================================================
// User Admin Types
// ============================================================================

export interface User {
  user_agent_id: string;
  user_email: string;
  user_name: string;
  display_name: string;
  role: string;
  department: string;
  agent_status: 'active' | 'inactive';
  priority_level: number | null;
  can_receive_nudges: boolean;
  can_receive_drafts: boolean;
  asana_user_id: string | null;
  hubspot_contact_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

export interface UserCreateRequest {
  user_email: string;
  user_name: string;
  display_name: string;
  role: string;
  department: string;
  priority_level?: number;
  can_receive_nudges?: boolean;
  can_receive_drafts?: boolean;
}

export interface UserUpdateRequest {
  display_name?: string;
  role?: string;
  department?: string;
  agent_status?: 'active' | 'inactive';
  priority_level?: number | null;
  can_receive_nudges?: boolean;
  can_receive_drafts?: boolean;
  asana_user_id?: string | null;
  hubspot_contact_id?: string | null;
}