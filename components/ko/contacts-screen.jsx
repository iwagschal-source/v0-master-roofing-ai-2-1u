"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Loader2, Building2, Users, ExternalLink } from "lucide-react"

export function ContactsScreen() {
  const [activeTab, setActiveTab] = useState("companies")
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch companies on mount and when search changes
  useEffect(() => {
    async function fetchCompanies() {
      try {
        setLoading(true)
        setError(null)
        const url = searchQuery
          ? `/api/ko/contacts?type=companies&search=${encodeURIComponent(searchQuery)}`
          : '/api/ko/contacts?type=companies'
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error(`Failed to fetch companies: ${res.status}`)
        }
        const data = await res.json()
        setCompanies(data.companies || [])
      } catch (err) {
        console.error('Error fetching companies:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timer = setTimeout(fetchCompanies, searchQuery ? 300 : 0)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleAddCompany = () => {
    console.log('Add company clicked - modal coming soon')
  }

  const handleEditCompany = (company) => {
    console.log('Edit company:', company.id, company.name)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Contacts</h1>
            <p className="text-sm text-muted-foreground">
              {companies.length} {activeTab === "companies" ? "companies" : "people"}
            </p>
          </div>
          <button
            onClick={handleAddCompany}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveTab("companies")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "companies"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Companies
          </button>
          <button
            disabled
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
            title="Coming soon"
          >
            <Users className="w-4 h-4" />
            People
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies..."
            className="w-full bg-secondary/30 border border-border/50 rounded-lg pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading companies...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="text-red-500 mb-4">
              <Building2 className="w-12 h-12" />
            </div>
            <p className="text-sm text-red-500 mb-2">Error loading companies</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <button
              onClick={() => setSearchQuery(searchQuery)} // Trigger refetch
              className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && companies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? "No companies found" : "No Companies Yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              {searchQuery
                ? `No companies match "${searchQuery}"`
                : "Add your first company to start tracking contacts."}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddCompany}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Company</span>
              </button>
            )}
          </div>
        )}

        {/* Companies Table */}
        {!loading && !error && companies.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Website
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => handleEditCompany(company)}
                    className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{company.name}</div>
                      {(company.city || company.state) && (
                        <div className="text-xs text-muted-foreground">
                          {[company.city, company.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {company.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {company.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {company.website ? (
                        <a
                          href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          {company.website.replace(/^https?:\/\//, "")}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
