export type SourceType = "pdf" | "chart" | "hubspot" | "powerbi" | "email" | "document"

export type SourceBadge = "Vertex AI" | "Power BI" | "HubSpot" | "Google Drive" | "Local File"

export interface HistoryItem {
  id: string
  type: SourceType
  label: string
  source: SourceBadge
  content: string // The actual content (could be HTML, markdown, or data)
  timestamp: Date
  preview?: string // Optional preview text
}

export interface MessageSource {
  itemId: string // References HistoryItem.id
  label: string // Display text for the citation link
}
